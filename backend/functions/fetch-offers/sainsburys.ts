/**
 * Sainsbury's adapter — half-price offers (most with Nectar) via the site's
 * own groceries JSON API.
 *
 * Verified in a real browser on 27 Jul 2026: the offers listing at
 * sainsburys.co.uk/gol-ui/offers/half-price is a client-side app fed by
 *   GET /groceries-api/gol-services/product/v1/product/filter-by
 *       ?page_number=N&page_size=60&is_slot_locked=false
 *       &sort_order=-relevance&filter[discount:percentage]=50&discount_percentage=50
 * -> 239 products. Fields: name, retail_price.price (current £),
 * promotions[]: { original_price, strap_line ("Half Price with Nectar"),
 * is_nectar, start/end dates }, full_url (product page).
 *
 * Nectar Prices are blanket member prices (same for every member) shown
 * publicly — NOT the personalised app-only "Your Nectar Prices" tier, which
 * has no central price list at all.
 *
 * Sainsbury's runs Akamai (with bot manager), so: realistic browser headers,
 * a cookie bootstrap GET on the offers page first, and the ScraperAPI
 * residential proxy (UK exit) with a sticky session so bootstrap + API share
 * one exit IP.
 */

import { scraperDispatcher, withRetry } from './proxy';
import type { RawOffer } from './types';

const SESSION = String(Math.floor(Date.now() / 1000) + 7); // distinct from other adapters' sessions
// via 'scraperapi': Sainsbury's filter-by API 403s through a plain residential
// proxy regardless of exit IP — its bot protection reads the TLS/browser
// fingerprint too. See the note on scraperDispatcher in proxy.ts.
const ukDispatcher = () => scraperDispatcher({ country: 'uk', session: SESSION, via: 'scraperapi' });

const BASE = 'https://www.sainsburys.co.uk';
const OFFERS_PAGE = `${BASE}/gol-ui/offers/half-price`;
const API = `${BASE}/groceries-api/gol-services/product/v1/product/filter-by`;
const PAGES = 2; // 60/page -> top ~120 half-price products

const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept-language': 'en-GB,en;q=0.9',
};

type SainsburysProduct = {
  name?: string;
  full_url?: string;
  retail_price?: { price?: number };
  promotions?: Array<{ original_price?: number; is_nectar?: boolean }>;
};

/** GET the offers page and return a Cookie header built from its Set-Cookie. */
async function bootstrapCookies(): Promise<string> {
  const res = await fetch(OFFERS_PAGE, {
    headers: { ...BROWSER_HEADERS, accept: 'text/html' },
    signal: AbortSignal.timeout(70_000), // ScraperAPI residential can be slow under load; their docs suggest ~70s
    dispatcher: ukDispatcher(),
  } as RequestInit);
  const raw: string[] = typeof (res.headers as any).getSetCookie === 'function'
    ? (res.headers as any).getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []);
  return raw.map(c => c.split(';')[0]).join('; ');
}

async function fetchPage(page: number, cookie: string): Promise<SainsburysProduct[]> {
  const url = `${API}?page_number=${page}&page_size=60&is_slot_locked=false`
    + `&sort_order=-relevance&filter%5Bdiscount%3Apercentage%5D=50&discount_percentage=50`;
  const res = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      'accept': 'application/json',
      'referer': OFFERS_PAGE,
      ...(cookie ? { cookie } : {}),
    },
    signal: AbortSignal.timeout(70_000),
    dispatcher: ukDispatcher(),
  } as RequestInit);
  if (!res.ok)
    throw new Error(`Sainsbury's filter-by API -> HTTP ${res.status} (page ${page})`);
  const json = await res.json() as { products?: SainsburysProduct[] };
  return json.products ?? [];
}

export async function fetchSainsburysOffers(): Promise<RawOffer[]> {
  let cookie = '';
  try {
    cookie = await bootstrapCookies();
  }
  catch {
    // Non-fatal: try the API without a cookie; it throws below if rejected.
  }

  const out: RawOffer[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= PAGES; page++) {
    const products = await withRetry(() => fetchPage(page, cookie));
    for (const p of products) {
      if (!p.name || p.retail_price?.price == null)
        continue;
      const key = p.name.toLowerCase();
      if (seen.has(key))
        continue;
      seen.add(key);
      const price = Math.round(p.retail_price.price * 100);
      const promo = p.promotions?.[0];
      const was = promo?.original_price != null ? Math.round(promo.original_price * 100) : null;
      out.push({
        retailer_id: 'sainsburys',
        product_name: p.name,
        brand: null, // brand is embedded in the product name
        price_pence: price,
        was_price_pence: was && was > price ? was : null,
        pack_size: null,
        offer_type: promo?.is_nectar ? 'loyalty' : 'price_drop',
        source_url: p.full_url ?? OFFERS_PAGE,
      });
    }
  }

  if (out.length === 0)
    throw new Error("Sainsbury's adapter found 0 products — API shape changed or Akamai-blocked");
  return out;
}
