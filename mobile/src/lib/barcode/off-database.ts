import * as SQLite from 'expo-sqlite';

export type OffProduct = {
  barcode: string;
  category: string | null;
  name: string;
};

// ─── Local SQLite cache ───────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('off_cache.db');
  await _db.execAsync(
    `CREATE TABLE IF NOT EXISTS off_cache (
      barcode TEXT PRIMARY KEY,
      name    TEXT NOT NULL,
      category TEXT,
      cached_at INTEGER NOT NULL
    );`,
  );
  return _db;
}

async function cacheProducts(db: SQLite.SQLiteDatabase, products: OffProduct[]): Promise<void> {
  const now = Date.now();
  for (const p of products) {
    await db.runAsync(
      'INSERT OR REPLACE INTO off_cache (barcode, name, category, cached_at) VALUES (?, ?, ?, ?)',
      [p.barcode, p.name, p.category, now],
    );
  }
}

// ─── Barcode lookup (used by barcode scanner) ─────────────────────────────

export async function lookupByBarcode(barcode: string): Promise<OffProduct | null> {
  const db = await openDb();

  // 1. Check local cache first
  const cached = await db.getFirstAsync<OffProduct>(
    'SELECT barcode, name, category FROM off_cache WHERE barcode = ?',
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
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // 1. Local cache — fast, works offline
  const cached = await db.getAllAsync<OffProduct>(
    `SELECT barcode, name, category FROM off_cache
     WHERE name LIKE ? COLLATE NOCASE
     ORDER BY name ASC LIMIT 8`,
    [`%${trimmed}%`],
  );

  // 2. Live OFF API search — runs concurrently with any cache miss
  let apiResults: OffProduct[] = [];
  try {
    const params = new URLSearchParams({
      search_terms: trimmed,
      search_simple: '1',
      action: 'process',
      json: '1',
      'countries_tags': 'en:united-kingdom',
      page_size: '15',
      fields: 'code,product_name,categories_tags',
    });
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
      { headers: { 'User-Agent': 'MotherCupboard/1.0' }, signal: AbortSignal.timeout(4000) },
    );
    if (res.ok) {
      const data = await res.json() as {
        products: { code: string; product_name?: string; categories_tags?: string[] }[];
      };
      apiResults = (data.products ?? [])
        .filter(p => p.product_name)
        .map(p => ({
          barcode: p.code,
          name: p.product_name!,
          category: cleanCategory(p.categories_tags?.[0] ?? null),
        }));

      // Cache API results for next time
      if (apiResults.length > 0) {
        await cacheProducts(db, apiResults);
      }
    }
  } catch {
    // Network unavailable — cached results are fine
  }

  // 3. Merge: cached first, then API results not already in cache, deduplicated
  const seen = new Set(cached.map(p => p.barcode));
  const fresh = apiResults.filter(p => !seen.has(p.barcode));
  return [...cached, ...fresh].slice(0, 15);
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
