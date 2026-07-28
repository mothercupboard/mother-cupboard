import type { OffProduct } from '@/lib/barcode/off-database';

import { cacheProducts, lookupByBarcode, pickOffQuantity } from '@/lib/barcode/off-database';
import { getActiveRegion } from '@/lib/region';

const OFF_WORLD_BASE = 'https://world.openfoodfacts.org/api/v0/product';

/**
 * Workstream B: query the active region's OFF country subdomain first so
 * region-specific product entries (own-brand ranges, local variants) are
 * preferred; fall back to the worldwide database when the regional lookup
 * doesn't resolve.
 */
function regionalApiBase(): string {
  return `https://${getActiveRegion().offSubdomain}.openfoodfacts.org/api/v0/product`;
}

// Compiled at module scope per e18e/prefer-static-regex
const LANG_PREFIX_RE = /^[a-z]{2}:/;
const DASH_RE = /-/g;

type ApiResponse = {
  product?: {
    categories_tags?: string[];
    product_name?: string;
    product_name_en?: string;
    /** Bare numeric pack size, e.g. 250 (often a JSON number, no unit). */
    product_quantity?: string | number;
    /** Unit for product_quantity, e.g. "g" or "ml". */
    product_quantity_unit?: string;
    /** Human-readable pack size WITH unit, e.g. "250 g", "6 x 330 ml". */
    quantity?: string;
  };
  status: number;
};

// ─── Quantity parser ──────────────────────────────────────────────────────────

const MULTI_QTY_RE = /\d+\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b/i;
const SIMPLE_QTY_RE = /(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b/i;
const BARE_NUMBER_RE = /^\d+(?:[.,]\d+)?$/;
// Categories that imply a liquid product, so a unitless OFF quantity is
// probably millilitres rather than grams.
const LIQUID_CATEGORY_RE = /beverage|drink|juice|water|milk|soda|cola|lemonade|squash|cordial|smoothie|beer|cider|wine|spirit|oil|vinegar/i;

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
 *
 * Some OFF entries hold a bare number with no unit (e.g. "400" on a tin of
 * beans). Rather than discard it, fall back to inferring the unit from the
 * product's category: liquid-sounding categories → ml, everything else → g.
 * The prefilled field stays editable, so a rare wrong guess is cheap; an
 * always-empty field costs the user typing on every scan.
 */
export function parseOffQuantity(raw: string | number | null, category?: string | null): { quantity: number; unit: 'g' | 'ml' } | null {
  if (raw == null || raw === '')
    return null;

  // Defensive: cached/API values can arrive as bare numbers — no unit
  const str = String(raw).trim();

  // Multi-pack: take per-unit quantity
  const multi = str.match(MULTI_QTY_RE);
  if (multi) {
    const qty = Number.parseFloat(multi[1].replace(',', '.'));
    return normalise(qty, multi[2].toLowerCase());
  }

  const simple = str.match(SIMPLE_QTY_RE);
  if (simple) {
    const qty = Number.parseFloat(simple[1].replace(',', '.'));
    return normalise(qty, simple[2].toLowerCase());
  }

  // Bare number, no unit — infer from category (400 on a tin of beans is
  // grams, not 400 beans; 500 on a bottle of squash is millilitres)
  if (BARE_NUMBER_RE.test(str)) {
    const qty = Number.parseFloat(str.replace(',', '.'));
    if (qty > 0)
      return { quantity: qty, unit: category && LIQUID_CATEGORY_RE.test(category) ? 'ml' : 'g' };
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
  // OFF lists categories broad → specific ("en:plant-based-foods-and-beverages"
  // … "en:baked-beans"). Take the LAST English tag: it's the most specific, it
  // reads better as a label, and the broad ones poison the liquid-category
  // check in parseOffQuantity ("…and-beverages" made a tin of beans → ml).
  const englishTags = tags.filter(t => t.startsWith('en:'));
  const tag = englishTags.at(-1) ?? tags.at(-1);
  if (!tag)
    return null;
  return tag.replace(LANG_PREFIX_RE, '').replace(DASH_RE, ' ') || null;
}

async function fetchFromEndpoint(base: string, barcode: string): Promise<OffProduct | null> {
  try {
    const res = await fetch(`${base}/${barcode}.json`, {
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
      productQuantity: pickOffQuantity(json.product),
    };
    return product;
  }
  catch {
    return null;
  }
}

async function fetchFromApi(barcode: string): Promise<OffProduct | null> {
  const regional = await fetchFromEndpoint(regionalApiBase(), barcode);
  const product = regional ?? await fetchFromEndpoint(OFF_WORLD_BASE, barcode);
  if (product) {
    // lookupByBarcode is cache-only, so caching happens here after a fetch
    try {
      await cacheProducts([product]);
    }
    catch {
      // Cache write failure shouldn't break the scan flow
    }
  }
  return product;
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
