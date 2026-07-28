/**
 * Woolworths NZ adapter — official public JSON API used by their own site.
 *
 * Verified in a real browser, 25 Jul 2026:
 *   GET https://www.woolworths.co.nz/api/v1/products?target=specials&useRankedSpecials=true&page=N
 *   with header  x-requested-with: OnlineShopping.WebApp   -> 200, ~25 items/page,
 *   ~5,000 specials total, ranked best-first. Without that header the API
 *   returns 400. Fields: name, brand, unit, price.salePrice/originalPrice.
 *
 * We take the first few ranked pages rather than all 5,000 — the top of the
 * ranking is where the headline weekly specials live, and it keeps the
 * ingredient-mapping batch small. Prices are NZD; stored in cents in the
 * same integer minor-units column as UK pence.
 *
 * NOTE: verified from a browser session; if the API ever demands cookies the
 * adapter throws loudly and we revisit (page-HTML fallback or headless).
 */

import { scraperDispatcher } from './proxy';
import type { RawOffer } from './types';

const API = 'https://www.woolworths.co.nz/api/v1/products?target=specials&useRankedSpecials=true';
const PAGES = 3; // ~75 top-ranked specials

// Realistic browser headers alongside the API's required x-requested-with —
// an honest bot UA gets silently dropped (request times out).
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-NZ,en;q=0.9',
  'x-requested-with': 'OnlineShopping.WebApp',
  'referer': 'https://www.woolworths.co.nz/shop/specials',
};

type WwsItem = {
  type: string;
  name?: string;
  brand?: string;
  unit?: string;
  sku?: string;
  slug?: string;
  price?: { salePrice?: number; originalPrice?: number };
};

const SPECIALS_URL = 'https://www.woolworths.co.nz/shop/specials';

/**
 * Deep link to the product page. Woolworths NZ uses query-based product URLs:
 * /shop/productdetails?stockcode=<sku>&name=<slug>. Both come straight from
 * the API. Falls back to the specials listing when the sku is missing.
 */
function productUrl(item: WwsItem): string {
  if (!item.sku)
    return SPECIALS_URL;
  const name = item.slug ?? '';
  return `https://www.woolworths.co.nz/shop/productdetails?stockcode=${item.sku}&name=${encodeURIComponent(name)}`;
}

/**
 * Fetch one page, retrying a couple of times on timeout / transient failure —
 * the API occasionally drops the first hit of a run (seen 25 Jul: first
 * attempt timed out, immediate retry returned 72 offers). For a weekly cron a
 * single flaky request would otherwise blank NZ offers for the whole week.
 */
async function fetchPageWithRetry(page: number, attempts = 3): Promise<WwsItem[]> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(`${API}&page=${page}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(70_000), // ScraperAPI residential can be slow under load; their docs suggest ~70s
        dispatcher: scraperDispatcher({ country: 'nz' }),
      } as RequestInit);
      if (!res.ok)
        throw new Error(`Woolworths NZ API -> HTTP ${res.status} (page ${page})`);
      const json = await res.json() as { products?: { items?: WwsItem[] } };
      return json.products?.items ?? [];
    }
    catch (err) {
      lastErr = err;
      if (attempt < attempts)
        await new Promise(r => setTimeout(r, 1000 * attempt)); // 1s, 2s backoff
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`Woolworths NZ page ${page} failed after ${attempts} attempts`);
}

export async function fetchWoolworthsNzOffers(): Promise<RawOffer[]> {
  const out: RawOffer[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= PAGES; page++) {
    let items: WwsItem[];
    try {
      items = await fetchPageWithRetry(page);
    }
    catch (err) {
      // A later page failing shouldn't blank pages we already have — two
      // pages of specials beats zero (seen 27 Jul: page 3 got HTTP 500 after
      // retries while pages 1–2 were fine). Page 1 failing still throws.
      if (out.length > 0) {
        console.error(`[fetch-offers] woolworths_nz page ${page} failed, keeping ${out.length} offers:`, err);
        break;
      }
      throw err;
    }

    for (const item of items) {
      if (item.type !== 'Product' || !item.name || item.price?.salePrice == null)
        continue;
      const key = item.name.toLowerCase();
      if (seen.has(key))
        continue;
      seen.add(key);
      const sale = Math.round(item.price.salePrice * 100);
      const original = item.price.originalPrice != null
        ? Math.round(item.price.originalPrice * 100)
        : null;
      out.push({
        retailer_id: 'woolworths_nz',
        product_name: item.name,
        brand: item.brand ?? null,
        price_pence: sale,
        was_price_pence: original && original > sale ? original : null,
        pack_size: item.unit ?? null,
        offer_type: 'price_drop',
        source_url: productUrl(item),
      });
    }
  }

  if (out.length === 0)
    throw new Error('Woolworths NZ adapter found 0 specials — API shape or access changed');
  return out;
}
