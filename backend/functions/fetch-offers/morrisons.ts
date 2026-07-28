/**
 * Morrisons adapter — promotions (Now/Was price cuts incl. More Card prices)
 * via the site's own listing API.
 *
 * Verified in a real browser on 27 Jul 2026:
 *   GET groceries.morrisons.com/api/product-listing-pages/v1/pages/promotions
 *       ?includeAdditionalPageInfo=true&maxPageSize=300&maxProductsToDecorate=50
 *       &regionId=8b151c2b-6955-4017-b3b0-a1620e898908
 * -> productGroups[].decoratedProducts[]: name, brand, price.amount (shelf/was £),
 *    promotions[].description e.g. "Now £3, Was £4.75", packSizeDescription.
 * Only "decorated" products carry full data (50/run) — plenty for the strip.
 *
 * The regionId is the site's default England region (from the browser's own
 * request, signed out). Cookie bootstrap GET on the promotions page first;
 * routed through the ScraperAPI residential proxy (UK exit, sticky session).
 */

import { scraperDispatcher, withRetry } from './proxy';
import type { RawOffer } from './types';

const SESSION = String(Math.floor(Date.now() / 1000) + 13); // distinct sticky session
const ukDispatcher = () => scraperDispatcher({ country: 'uk', session: SESSION });

const BASE = 'https://groceries.morrisons.com';
const PROMOS_PAGE = `${BASE}/promotions`;
const API = `${BASE}/api/product-listing-pages/v1/pages/promotions`
  + `?includeAdditionalPageInfo=true&maxPageSize=300&maxProductsToDecorate=50`
  + `&regionId=8b151c2b-6955-4017-b3b0-a1620e898908`;

const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept-language': 'en-GB,en;q=0.9',
};

const NOW_RE = /Now\s*£\s*(\d+(?:\.\d{1,2})?)/i;

type MorrisonsProduct = {
  name?: string;
  brand?: string;
  packSizeDescription?: string;
  retailerProductId?: string;
  price?: { amount?: number };
  promoPrice?: { amount?: number } | number | null;
  promotions?: Array<{ description?: string }>;
};
type ProductGroup = { decoratedProducts?: MorrisonsProduct[] };

/** "Mighty Big 3 Rolls" -> "mighty-big-3-rolls" for the product-page URL slug. */
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Deep link to the product page. Morrisons resolves /products/<slug>/<id>
 * (and even id-only) with a redirect, so the slug is cosmetic and the
 * retailerProductId is what matters. Falls back to the promotions listing
 * when the id is missing.
 */
function productUrl(p: MorrisonsProduct): string {
  if (!p.retailerProductId || !p.name)
    return PROMOS_PAGE;
  return `${BASE}/products/${slugify(p.name)}/${p.retailerProductId}`;
}

async function bootstrapCookies(): Promise<string> {
  const res = await fetch(PROMOS_PAGE, {
    headers: { ...BROWSER_HEADERS, accept: 'text/html' },
    signal: AbortSignal.timeout(70_000), // ScraperAPI residential can be slow under load; their docs suggest ~70s
    dispatcher: ukDispatcher(),
  } as RequestInit);
  const raw: string[] = typeof (res.headers as any).getSetCookie === 'function'
    ? (res.headers as any).getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []);
  return raw.map(c => c.split(';')[0]).join('; ');
}

export async function fetchMorrisonsOffers(): Promise<RawOffer[]> {
  let cookie = '';
  try {
    cookie = await bootstrapCookies();
  }
  catch {
    // Non-fatal: try the API without a cookie; it throws below if rejected.
  }

  const json = await withRetry(async () => {
    const res = await fetch(API, {
      headers: {
        ...BROWSER_HEADERS,
        'accept': 'application/json',
        'referer': PROMOS_PAGE,
        ...(cookie ? { cookie } : {}),
      },
      signal: AbortSignal.timeout(70_000),
      dispatcher: ukDispatcher(),
    } as RequestInit);
    if (!res.ok)
      throw new Error(`Morrisons promotions API -> HTTP ${res.status}`);
    return await res.json() as { productGroups?: ProductGroup[] };
  });

  const out: RawOffer[] = [];
  const seen = new Set<string>();
  for (const p of (json.productGroups ?? []).flatMap(g => g.decoratedProducts ?? [])) {
    if (!p.name || p.price?.amount == null)
      continue;
    const key = p.name.toLowerCase();
    if (seen.has(key))
      continue;

    // Offer price: promoPrice when present, else "Now £X" from the strapline.
    const promoAmount = typeof p.promoPrice === 'number'
      ? p.promoPrice
      : p.promoPrice?.amount;
    const desc = p.promotions?.[0]?.description ?? '';
    const nowMatch = NOW_RE.exec(desc);
    const offerPound = promoAmount ?? (nowMatch ? parseFloat(nowMatch[1]) : null);
    if (offerPound == null)
      continue; // multibuy-style promo with no single price — skip

    seen.add(key);
    const price = Math.round(offerPound * 100);
    const was = Math.round(p.price.amount * 100);
    out.push({
      retailer_id: 'morrisons',
      product_name: p.name,
      brand: p.brand || null,
      price_pence: price,
      was_price_pence: was > price ? was : null,
      pack_size: p.packSizeDescription || null,
      offer_type: 'price_drop',
      source_url: productUrl(p),
    });
  }

  if (out.length === 0)
    throw new Error('Morrisons adapter found 0 products — API shape changed or bot-blocked');
  return out;
}
