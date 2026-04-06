import * as SQLite from 'expo-sqlite';

export type OffProduct = {
  barcode: string;
  category: string | null;
  name: string;
};

// Curated UK subset — common UK products from Open Food Facts.
// Expand by running scripts/seed-off-cache.ts with a full OFF UK export.
const UK_SEED: OffProduct[] = [
  { barcode: '5000157024584', category: 'canned-foods', name: 'Heinz Beanz' },
  { barcode: '5000157011454', category: 'condiments', name: 'Heinz Tomato Ketchup' },
  { barcode: '5000157071800', category: 'soups', name: 'Heinz Cream of Tomato Soup' },
  { barcode: '5010002013408', category: 'breads', name: 'Warburtons Medium White Bread' },
  { barcode: '5010152010044', category: 'breads', name: 'Hovis Wholemeal Bread' },
  { barcode: '5000328005129', category: 'snacks', name: 'Walkers Ready Salted Crisps' },
  { barcode: '7622210450112', category: 'chocolates', name: 'Cadbury Dairy Milk' },
  { barcode: '5010018000414', category: 'breakfast-cereals', name: 'Kellogg\'s Corn Flakes' },
  { barcode: '5000221011066', category: 'beverages', name: 'PG Tips 80 Tea Bags' },
  { barcode: '5000168009088', category: 'biscuits', name: 'McVitie\'s Digestive Biscuits' },
  { barcode: '5411188109938', category: 'plant-milks', name: 'Alpro Oat Milk' },
  { barcode: '5000116201503', category: 'fish-products', name: 'Birds Eye Fish Fingers' },
  { barcode: '5017461008503', category: 'cheeses', name: 'Cathedral City Mature Cheddar' },
  { barcode: '5011501506574', category: 'juices', name: 'Innocent Orange Juice' },
  { barcode: '5000159407236', category: 'pasta-sauces', name: 'Dolmio Bolognese Sauce' },
  { barcode: '8712566171521', category: 'coffees', name: 'Douwe Egberts Coffee' },
  { barcode: '5000347012610', category: 'breakfast-cereals', name: 'Quaker Oats' },
  { barcode: '5000232070019', category: 'household', name: 'Andrex Toilet Tissue' },
  { barcode: '5010193143050', category: 'household', name: 'Fairy Washing Up Liquid' },
  { barcode: '4008400402178', category: 'household', name: 'Persil Washing Powder' },
];

let _db: SQLite.SQLiteDatabase | null = null;
let _seeded = false;

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db)
    return _db;
  _db = await SQLite.openDatabaseAsync('off_cache.db');
  await _db.execAsync(
    `CREATE TABLE IF NOT EXISTS off_cache (
      barcode TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      cached_at INTEGER NOT NULL
    );`,
  );
  return _db;
}

async function seedIfNeeded(database: SQLite.SQLiteDatabase): Promise<void> {
  if (_seeded)
    return;
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM off_cache',
  );
  if ((row?.count ?? 0) > 0) {
    _seeded = true;
    return;
  }
  const now = Date.now();
  for (const p of UK_SEED) {
    await database.runAsync(
      'INSERT OR IGNORE INTO off_cache (barcode, name, category, cached_at) VALUES (?, ?, ?, ?)',
      [p.barcode, p.name, p.category, now],
    );
  }
  _seeded = true;
}

export async function lookupByBarcode(barcode: string): Promise<OffProduct | null> {
  const database = await openDb();
  await seedIfNeeded(database);
  return database.getFirstAsync<OffProduct>(
    'SELECT barcode, name, category FROM off_cache WHERE barcode = ?',
    [barcode],
  );
}

export async function searchByName(query: string): Promise<OffProduct[]> {
  const database = await openDb();
  await seedIfNeeded(database);
  return database.getAllAsync<OffProduct>(
    'SELECT barcode, name, category FROM off_cache WHERE name LIKE ? ORDER BY name LIMIT 20',
    [`%${query}%`],
  );
}

export async function cacheProduct(product: OffProduct): Promise<void> {
  const database = await openDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO off_cache (barcode, name, category, cached_at) VALUES (?, ?, ?, ?)',
    [product.barcode, product.name, product.category, Date.now()],
  );
}
