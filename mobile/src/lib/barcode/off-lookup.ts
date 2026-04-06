import type { OffProduct } from '@/lib/barcode/off-database';

import { cacheProduct, lookupByBarcode } from '@/lib/barcode/off-database';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v0/product';

// Compiled at module scope per e18e/prefer-static-regex
const LANG_PREFIX_RE = /^[a-z]{2}:/;
const DASH_RE = /-/g;

type ApiResponse = {
  product?: {
    categories_tags?: string[];
    product_name?: string;
    product_name_en?: string;
  };
  status: number;
};

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
    };
    await cacheProduct(product);
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
