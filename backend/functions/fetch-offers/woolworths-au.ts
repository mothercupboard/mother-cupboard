/**
 * Woolworths Australia adapter — the site's own browse API, Half Price category.
 *
 * Reverse-engineered in a real browser, 25 Jul 2026:
 *   1. GET  /shop/browse/specials/half-price      -> sets session cookies
 *   2. POST /apis/ui/browse/category  { categoryId: 'specialsgroup.3676', ... }
 *      -> { Bundles: [{ Products: [{ DisplayName, Brand, Price, WasPrice,
 *         SavingsAmount, PackageSize }] }], TotalRecordCount } — ~1,800
 *      genuine half-price items, 36/page.
 *
 * The category id came from GET /apis/ui/PiesCategoriesWithSpecials
 * (Specials → Half Price = specialsgroup.3676; stable).
 *
 * Woolworths AU guards the API: needs realistic browser headers AND the
 * session cookie from step 1 (a cold POST is rejected). Prices are AUD →
 * stored as integer cents. Throws loudly on 0 products.
 *
 * NOTE: verified from a browser (its cookies). The cookie bootstrap below
 * replicates that for a plain server, but Woolworths AU also runs bot
 * protection that can block datacenter IPs — if the Lambda run comes back
 * empty/blocked, this needs the headless-browser route like PAK'nSAVE.
 */

import { scraperDispatcher } from './proxy';
import type { RawOffer } from './types';

// One sticky proxy session per run so the cookie bootstrap and the POST calls
// share the same residential exit IP (Woolworths ties the session to the IP).
const SESSION = String(Math.floor(Date.now() / 1000));
const auDispatcher = () => scraperDispatcher({ country: 'au', session: SESSION });

const BASE = 'https://www.woolworths.com.au';
const HALF_PRICE_URL = `${BASE}/shop/browse/specials/half-price`;
const BROWSE_API = `${BASE}/apis/ui/browse/category`;
const CATEGORY_ID = 'specialsgroup.3676'; // Specials → Half Price
const PAGES = 3; // 36/page → ~100 top half-price items

const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept-language': 'en-AU,en;q=0.9',
};

type WoolAuProduct = {
  DisplayName?: string;
  Brand?: string;
  Price?: number;
  WasPrice?: number;
  PackageSize?: string;
};
type WoolAuBundle = { Products?: WoolAuProduct[] };

/** GET the specials page and return a Cookie header built from its Set-Cookie. */
async function bootstrapCookies(): Promise<string> {
  const res = await fetch(HALF_PRICE_URL, {
    headers: { ...BROWSER_HEADERS, accept: 'text/html' },
    signal: AbortSignal.timeout(45_000), // proxied requests are slower
    dispatcher: auDispatcher(),
  } as RequestInit);
  // Node 20+ exposes getSetCookie(); fall back to the folded header.
  const raw: string[] = typeof (res.headers as any).getSetCookie === 'function'
    ? (res.headers as any).getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []);
  return raw.map(c => c.split(';')[0]).join('; ');
}

async function fetchPage(page: number, cookie: string): Promise<WoolAuBundle[]> {
  const res = await fetch(BROWSE_API, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'accept': 'application/json',
      'content-type': 'application/json',
      'referer': HALF_PRICE_URL,
      'x-requested-with': 'XMLHttpRequest',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({
      categoryId: CATEGORY_ID,
      pageNumber: page,
      pageSize: 36,
      sortType: 'TraderRelevance',
      url: '/shop/browse/specials/half-price',
      location: '/shop/browse/specials/half-price',
      formatObject: '{"name":"Half Price"}',
      isSpecial: true,
      isBundle: false,
      isMobile: false,
      filters: [],
      token: '',
      gpBoost: 0,
      isHideUnavailableProducts: false,
      enableAdReRanking: false,
      groupEdmVariants: true,
      categoryVersion: 'v2',
    }),
    signal: AbortSignal.timeout(45_000), // proxied requests are slower
    dispatcher: auDispatcher(),
  } as RequestInit);
  if (!res.ok)
    throw new Error(`Woolworths AU browse -> HTTP ${res.status} (page ${page})`);
  const json = await res.json() as { Bundles?: WoolAuBundle[] };
  return json.Bundles ?? [];
}

export async function fetchWoolworthsAuOffers(): Promise<RawOffer[]> {
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
    const bundles = await fetchPage(page, cookie);
    for (const bundle of bundles) {
      const p = bundle.Products?.[0];
      if (!p?.DisplayName || p.Price == null)
        continue;
      const key = p.DisplayName.toLowerCase();
      if (seen.has(key))
        continue;
      seen.add(key);
      const price = Math.round(p.Price * 100);
      const was = p.WasPrice != null ? Math.round(p.WasPrice * 100) : null;
      out.push({
        retailer_id: 'woolworths_au',
        product_name: p.DisplayName,
        brand: p.Brand || null,
        price_pence: price,
        was_price_pence: was && was > price ? was : null,
        pack_size: p.PackageSize || null,
        offer_type: 'price_drop',
        source_url: HALF_PRICE_URL,
      });
    }
  }

  if (out.length === 0)
    throw new Error('Woolworths AU adapter found 0 products — cookie/bot block or API shape changed');
  return out;
}
