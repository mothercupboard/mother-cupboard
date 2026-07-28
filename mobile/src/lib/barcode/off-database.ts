import * as SQLite from 'expo-sqlite';

export type OffProduct = {
  barcode: string;
  category: string | null;
  name: string;
  /** Raw quantity string from Open Food Facts e.g. "250 g", "500ml", "6 x 330 ml". */
  productQuantity: string | null;
};

/**
 * Picks the best raw quantity string from an OFF API product object.
 *
 * OFF's `quantity` field is the display string WITH a unit ("250 g",
 * "6 x 330 ml") — prefer it. `product_quantity` alone is a bare number
 * (often a JSON number) with no unit, so it's only usable when
 * `product_quantity_unit` is also present.
 */
export function pickOffQuantity(p: {
  product_quantity?: string | number;
  product_quantity_unit?: string;
  quantity?: string;
}): string | null {
  if (typeof p.quantity === 'string' && p.quantity.trim())
    return p.quantity.trim();
  if (p.product_quantity != null && p.product_quantity !== '' && p.product_quantity_unit)
    return `${p.product_quantity} ${p.product_quantity_unit}`;
  return null;
}

// ─── Local SQLite cache ───────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db)
    return _db;
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
  // Purge entries cached before the quantity/name-preference fixes (28 July
  // 2026): they hold a bare numeric product_quantity (unparseable) and
  // possibly a non-English product name. Deleting them makes the next scan
  // re-fetch with the corrected mapping.
  await _db.runAsync('DELETE FROM off_cache WHERE cached_at < ?', [QUANTITY_FIX_CUTOFF_MS]);
  return _db;
}

/** Epoch ms of the latest cache-shape fix (category specificity) — 28 July 2026. */
const QUANTITY_FIX_CUTOFF_MS = 1785235530486;

export async function cacheProducts(products: OffProduct[]): Promise<void> {
  const db = await openDb();
  const now = Date.now();
  for (const p of products) {
    await db.runAsync(
      'INSERT OR REPLACE INTO off_cache (barcode, name, category, cached_at, product_quantity) VALUES (?, ?, ?, ?, ?)',
      [p.barcode, p.name, p.category, now, p.productQuantity ?? null],
    );
  }
}

// ─── Barcode lookup (used by barcode scanner) ─────────────────────────────

/**
 * Cache-only lookup. Network fetching lives in off-lookup.ts (resolveBarcode),
 * which queries the region's OFF subdomain first and prefers English names —
 * fetching here as well would bypass that logic (it did, until 28 July 2026:
 * the world-DB fetch in this function returned raw `product_name`, which is
 * how a German "Linsen" name reached the UK add-item form).
 */
export async function lookupByBarcode(barcode: string): Promise<OffProduct | null> {
  const db = await openDb();
  const cached = await db.getFirstAsync<OffProduct>(
    'SELECT barcode, name, category, product_quantity AS productQuantity FROM off_cache WHERE barcode = ?',
    [barcode],
  );
  return cached ?? null;
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
  if (cached.length >= 3)
    return cached;
  // 2. Fallback: search Open Food Facts API
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,product_name_en,categories_tags,quantity,product_quantity,product_quantity_unit`,
      { signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 5000); return ac.signal; })() },
    );
    if (!res.ok)
      return cached;
    const data = await res.json();
    const products: OffProduct[] = (data.products ?? [])
      .filter((p: any) => (p.product_name_en || p.product_name) && p.code)
      .map((p: any) => ({
        barcode: p.code,
        name: (p.product_name_en || p.product_name).trim(),
        // Last tag = most specific (see extractCategory in off-lookup.ts)
        category: p.categories_tags?.at(-1)?.replace('en:', '') ?? null,
        productQuantity: pickOffQuantity(p),
      }));
    if (products.length > 0)
      await cacheProducts(products);
    // Merge cached + online, deduplicate by barcode
    const merged = new Map<string, OffProduct>();
    for (const p of [...cached, ...products]) merged.set(p.barcode, p);
    return [...merged.values()].slice(0, 20);
  }
  catch {
    return cached;
  }
}
