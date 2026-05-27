import * as SQLite from 'expo-sqlite';

export type OffProduct = {
  barcode: string;
  category: string | null;
  name: string;
  /** Raw quantity string from Open Food Facts e.g. "250 g", "500ml", "6 x 330 ml". */
  productQuantity: string | null;
};

// ─── Local SQLite cache ───────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('off_cache.db');
  await _db.execAsync(
    `CREATE TABLE IF NOT EXISTS off_cache (
      barcode          TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      category         TEXT,
      cached_at        INTEGER NOT NULL,
      product_quantity TEXT
    );`,
  );
  // Graceful migration for existing installs that lack the column
  try {
    await _db.execAsync('ALTER TABLE off_cache ADD COLUMN product_quantity TEXT');
  }
  catch {
    // Column already exists — safe to ignore
  }
  return _db;
}

async function cacheProducts(db: SQLite.SQLiteDatabase, products: OffProduct[]): Promise<void> {
  const now = Date.now();
  for (const p of products) {
    await db.runAsync(
      'INSERT OR REPLACE INTO off_cache (barcode, name, category, cached_at, product_quantity) VALUES (?, ?, ?, ?, ?)',
      [p.barcode, p.name, p.category, now, p.productQuantity ?? null],
    );
  }
}

// ─── Barcode lookup (used by barcode scanner) ─────────────────────────────

export async function lookupByBarcode(barcode: string): Promise<OffProduct | null> {
  const db = await openDb();

  // 1. Check local cache first
  const cached = await db.getFirstAsync<OffProduct>(
    'SELECT barcode, name, category, product_quantity AS productQuantity FROM off_cache WHERE barcode = ?',
    [barcode],
  );
  if (cached) return cached;

  // 2. Fetch from Open Food Facts
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { headers: { 'User-Agent': 'MotherCupboard/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json() as { status: number; product?: { product_name?: string; categories_tags?: string[] } };
    if (data.status !== 1 || !data.product?.product_name) return null;

    const product: OffProduct = {
      barcode,
      name: data.product.product_name,
      category: cleanCategory(data.product.categories_tags?.[0] ?? null),
      productQuantity: (data.product as any).product_quantity ?? null,
    };
    await cacheProducts(db, [product]);
    return product;
  } catch {
    return null;
  }
}

// ─── Name search (used by Search by Name screen) ──────────────────────────

/**
 * Searches Open Food Facts for UK products matching the query,
 * with a local SQLite cache for instant repeat lookups.
 */
export async function searchByName(query: string): Promise<OffProduct[]> {
  const db = await openDb();
  const q = `%${query}%`;
  // 1. Check local cache
  const cached = await db.getAllAsync<OffProduct>(
    'SELECT barcode, name, category, product_quantity AS productQuantity FROM off_cache WHERE name LIKE ? LIMIT 20',
    [q],
  );
  if (cached.length >= 3) return cached;
  // 2. Fallback: search Open Food Facts API
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,categories_tags`,
      { signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 5000); return ac.signal; })() },
    );
    if (!res.ok) return cached;
    const data = await res.json();
    const products: OffProduct[] = (data.products ?? [])
      .filter((p: any) => p.product_name && p.code)
      .map((p: any) => ({
        barcode: p.code,
        name: p.product_name,
        category: p.categories_tags?.[0]?.replace('en:', '') ?? null,
        productQuantity: p.product_quantity ?? null,
      }));
    if (products.length > 0) await cacheProducts(db, products);
    // Merge cached + online, deduplicate by barcode
    const merged = new Map<string, OffProduct>();
    for (const p of [...cached, ...products]) merged.set(p.barcode, p);
    return [...merged.values()].slice(0, 20);
  } catch {
    return cached;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function cleanCategory(raw: string | null): string | null {
  if (!raw) return null;
  // OFF tags look like "en:dairy-products" → "Dairy products"
  return raw
    .replace(/^[a-z]{2}:/, '')
    .replace(/-/g, ' ')
    .replace(/^./, c => c.toUpperCase());
}
