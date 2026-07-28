/**
 * SuperValu (Ireland) adapter — all promotions via the storefront gateway API.
 *
 * Verified in a real browser on 27 Jul 2026:
 *   GET storefrontgateway.supervalu.ie/api/stores/5550/promotions/products
 *       ?q=*&take=100&page=1
 *   with header  x-shopping-mode: <any uuid>   -> 200, 2,070 promo products.
 *   (Without that header the gateway answers 400 "Shopping mode must be
 *   informed as a header".) Store 5550 is the site's default online store.
 *
 * Fields: name "SuperValu Strawberries (350 g)", brand, priceNumeric (€),
 * promotions/promotionInfo carrying deal text like "3 for €10" or
 * "Rewards Price Only €2.50". Multibuy deals keep the shelf price and are
 * tagged offer_type 'multibuy'; single-price deals are 'price_drop'.
 *
 * DIRECT fetch, no proxy: verified 27 Jul that the gateway answers
 * datacenter IPs with its normal application errors (400 "shopping mode…")
 * rather than a WAF block — no cookies needed either (works with
 * credentials omitted in-browser). Routing it through ScraperAPI actually
 * BROKE it (HTTP 500), so the proxy is deliberately not used here.
 */

import type { RawOffer } from './types';

const STORE = '5550';
const API = `https://storefrontgateway.supervalu.ie/api/stores/${STORE}/promotions/products?q=*&take=100&page=1`;
const OFFERS_PAGE = `https://shop.supervalu.ie/sm/delivery/rsid/${STORE}/promotions`;

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept': 'application/json',
  'accept-language': 'en-IE,en;q=0.9',
  'x-shopping-mode': '11111111-1111-1111-1111-111111111111',
};

type SuperValuProduct = {
  sku?: string;
  name?: string;
  brand?: string;
  priceNumeric?: number;
  unitOfSize?: { size?: number; type?: string };
  promotionInfo?: unknown;
  promotions?: Array<{ description?: string } | string>;
};

/** "SuperValu Strawberries (350 g)" -> { name, pack: "350 g" } */
function splitPack(raw: string): { name: string; pack: string | null } {
  const m = /^(.*)\(([^)]+)\)\s*$/.exec(raw);
  return m ? { name: m[1].trim(), pack: m[2].trim() } : { name: raw, pack: null };
}

/**
 * Deep link to the product page:
 *   /sm/delivery/rsid/5550/product/<slug>-id-<sku>
 * The slug is the FULL display name (incl. pack) slugified — verified to match
 * SuperValu's own links, e.g. "SuperValu Strawberries (350 g)" ->
 * "supervalu-strawberries-350-g". Falls back to the promotions listing when
 * the sku is missing.
 */
function productUrl(rawName: string, sku: string | undefined): string {
  if (!sku)
    return OFFERS_PAGE;
  const slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `https://shop.supervalu.ie/sm/delivery/rsid/${STORE}/product/${slug}-id-${sku}`;
}

function promoText(p: SuperValuProduct): string {
  const bits: string[] = [];
  for (const pr of p.promotions ?? [])
    bits.push(typeof pr === 'string' ? pr : pr?.description ?? '');
  if (typeof p.promotionInfo === 'string') bits.push(p.promotionInfo);
  return bits.join(' ');
}

/** Fetch with a couple of retries — a transient 5xx shouldn't blank IE's week. */
async function fetchWithRetry(attempts = 3): Promise<{ items?: SuperValuProduct[] }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(API, {
        headers: HEADERS,
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok)
        throw new Error(`SuperValu promotions API -> HTTP ${res.status}`);
      return await res.json() as { items?: SuperValuProduct[] };
    }
    catch (err) {
      lastErr = err;
      if (attempt < attempts)
        await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('SuperValu fetch failed');
}

export async function fetchSupervaluOffers(): Promise<RawOffer[]> {
  const json = await fetchWithRetry();

  const out: RawOffer[] = [];
  const seen = new Set<string>();
  for (const p of json.items ?? []) {
    if (!p.name || p.priceNumeric == null)
      continue;
    const { name, pack } = splitPack(p.name);
    const key = name.toLowerCase();
    if (seen.has(key))
      continue;
    seen.add(key);
    const isMultibuy = /\d\s*for\s*€/i.test(promoText(p));
    out.push({
      retailer_id: 'supervalu',
      product_name: name,
      brand: p.brand || null,
      price_pence: Math.round(p.priceNumeric * 100), // EUR cents
      was_price_pence: null, // gateway exposes deal text, not a was-price
      pack_size: pack,
      offer_type: isMultibuy ? 'multibuy' : 'price_drop',
      source_url: productUrl(p.name, p.sku),
    });
  }

  if (out.length === 0)
    throw new Error('SuperValu adapter found 0 promo products — API shape changed or blocked');
  return out;
}
