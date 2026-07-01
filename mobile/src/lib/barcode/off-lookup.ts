import type { OffProduct } from '@/lib/barcode/off-database';

import { lookupByBarcode } from '@/lib/barcode/off-database';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v0/product';

// Compiled at module scope per e18e/prefer-static-regex
const LANG_PREFIX_RE = /^[a-z]{2}:/;
const DASH_RE = /-/g;

type ApiResponse = {
  product?: {
    categories_tags?: string[];
    product_name?: string;
    product_name_en?: string;
    product_quantity?: string;
  };
  status: number;
};

// ─── Quantity parser ──────────────────────────────────────────────────────────

const MULTI_QTY_RE = /\d+\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b/i;
const SIMPLE_QTY_RE = /(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b/i;

/**
 * Parses an Open Food Facts `product_quantity` string into a quantity + unit
 * normalised to grams or millilitres. Returns null if the string isn't parseable.
 *
 * Examples:
 *   "250 g"      → { quantity: 250,  unit: 'g'  }
 *   "1 kg"       → { quantity: 1000, unit: 'g'  }
 *   "500ml"      → { quantity: 500,  unit: 'ml' }
 *   "1.5 l"      → { quantity: 1500, unit: 'ml' }
 *   "6 x 330 ml" → { quantity: 330,  unit: 'ml' } (per-unit)
 */
export function parseOffQuantity(raw: string | null): { quantity: number; unit: 'g' | 'ml' } | null {
  if (!raw)
    return null;

  // Multi-pack: take per-unit quantity
  const multi = raw.match(MULTI_QTY_RE);
  if (multi) {
    const qty = Number.parseFloat(multi[1].replace(',', '.'));
    return normalise(qty, multi[2].toLowerCase());
  }

  const simple = raw.match(SIMPLE_QTY_RE);
  if (simple) {
    const qty = Number.parseFloat(simple[1].replace(',', '.'));
    return normalise(qty, simple[2].toLowerCase());
  }

  return null;
}

function normalise(qty: number, unit: string): { quantity: number; unit: 'g' | 'ml' } | null {
  if (unit === 'g')
    return { quantity: qty, unit: 'g' };
  if (unit === 'kg')
    return { quantity: Math.round(qty * 1000), unit: 'g' };
  if (unit === 'ml')
    return { quantity: qty, unit: 'ml' };
  if (unit === 'l')
    return { quantity: Math.round(qty * 1000), unit: 'ml' };
  return null;
}

function extractCategory(tags: string[] | undefined): string | null {
  if (!tags || tags.length === 0)
    return null;
  const englishTag = tags.find(t => t.startsWith('en:'));
  const tag = englishTag ?? tags[0];
  if (!tag)
    return null;
  return tag.replace(LANG_PREFIX_RE, '').replace(DASH_RE, ' ') || null;
}

async function fetchFromApi(barcode: string): Promise<OffProduct | null> {
  try {
    const res = await fetch(`${OFF_API_BASE}/${barcode}.json`, {
      headers: { 'User-Agent': 'MotherCupboard/1.0 (https://mothercupboard.app)' },
    });
    if (!res.ok)
      return null;
    const json = await res.json() as ApiResponse;
    if (json.status !== 1 || !json.product)
      return null;
    const name = (json.product.product_name_en ?? json.product.product_name ?? '').trim();
    if (!name)
      return null;
    const product: OffProduct = {
      barcode,
      category: extractCategory(json.product.categories_tags),
      name,
      productQuantity: json.product.product_quantity ?? null,
    };
    return product;
  }
  catch {
    return null;
  }
}

/**
 * Resolves a barcode to a product. Checks the local SQLite cache first;
 * falls back to the Open Food Facts API when online. Returns null if neither
 * resolves — the caller should show the manual entry fallback (Story 2.2).
 */
export async function resolveBarcode(barcode: string): Promise<OffProduct | null> {
  const cached = await lookupByBarcode(barcode);
  if (cached)
    return cached;
  return fetchFromApi(barcode);
}
