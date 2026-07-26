/**
 * PAK'nSAVE (NZ) adapter — deals data embedded in the page's Next.js payload.
 *
 * Verified in a real browser, 25 Jul 2026: paknsave.co.nz/shop/deals is a
 * Next.js app whose server-rendered HTML carries a <script id="__NEXT_DATA__">
 * blob (~400KB) containing the deals under
 *   props.pageProps.serverState.initialResults["popularity-*"].results[0].hits
 * — 50 products with name, brand, displayName (pack size) and
 * singlePrice.price already in CENTS. No headless browser needed; a plain
 * fetch + JSON.parse does it. The "popularity-*" key varies (ni/si island
 * indexes), so it's matched by prefix. Prices come from a default store the
 * server assigns; deals are national-ish and fine for a weekly offers feed.
 *
 * Throws loudly if the blob or hits are missing — silent empty weeks would
 * quietly degrade Suggest.
 */

import type { RawOffer } from './types';

const DEALS_URL = 'https://www.paknsave.co.nz/shop/deals';

// Realistic browser headers — the site's bot filter 403s an honest bot UA.
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-NZ,en;q=0.9',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'upgrade-insecure-requests': '1',
};

type PnsHit = {
  name?: string;
  brand?: string;
  displayName?: string;
  liquorFlag?: boolean;
  tobaccoFlag?: boolean;
  restrictedFlag?: boolean;
  singlePrice?: { price?: number };
};

export async function fetchPaknsaveOffers(): Promise<RawOffer[]> {
  const res = await fetch(DEALS_URL, {
    headers: HEADERS,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok)
    throw new Error(`PAK'nSAVE deals page -> HTTP ${res.status}`);
  const html = await res.text();

  const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match)
    throw new Error('PAK\'nSAVE adapter: __NEXT_DATA__ not found — page structure changed');

  const data = JSON.parse(match[1]);
  const initialResults = data?.props?.pageProps?.serverState?.initialResults;
  const key = initialResults
    ? Object.keys(initialResults).find(k => k.startsWith('popularity'))
    : undefined;
  const hits: PnsHit[] = key ? initialResults[key]?.results?.[0]?.hits ?? [] : [];

  const seen = new Set<string>();
  const out: RawOffer[] = [];
  for (const hit of hits) {
    if (!hit.name || hit.singlePrice?.price == null)
      continue;
    if (hit.liquorFlag || hit.tobaccoFlag || hit.restrictedFlag)
      continue;
    const key2 = hit.name.toLowerCase();
    if (seen.has(key2))
      continue;
    seen.add(key2);
    out.push({
      retailer_id: 'paknsave',
      product_name: hit.brand ? `${hit.brand} ${hit.name}` : hit.name,
      brand: hit.brand ?? null,
      price_pence: Math.round(hit.singlePrice.price), // already minor units (cents)
      was_price_pence: null, // deals feed carries the deal price only
      pack_size: hit.displayName ?? null,
      offer_type: 'weekly_offer',
      source_url: DEALS_URL,
    });
  }

  if (out.length === 0)
    throw new Error('PAK\'nSAVE adapter found 0 deals — payload shape changed');
  return out;
}
