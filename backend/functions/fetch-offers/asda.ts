/**
 * Asda adapter — Rollback offers via Asda's own public Algolia search index.
 *
 * Verified in a real browser on 27 Jul 2026: asda.com's groceries site runs
 * its product listing on Algolia (app 8I6WSKCCNV, index ASDA_PRODUCTS,
 * ~121k products). The API key below is Asda's PUBLIC search-only key,
 * shipped to every browser in their JS bundle — not a secret. Filtering on
 * LABEL:Rollback returned 3,998 products.
 *
 * Asda deliberately has no loyalty-pricing scheme ("Asda Price" strategy);
 * Rollback is their public price-cut programme, so offer_type is price_drop.
 * The index carries no was-price (the site decorates that separately from a
 * session-gated API), so was_price_pence is null.
 *
 * NO PROXY NEEDED: Algolia is a neutral search CDN with no datacenter-IP
 * blocking — this is the cheapest adapter in the fleet (zero ScraperAPI
 * credits). If the key rotates, re-grab it from any asda.com page source.
 */

import type { RawOffer } from './types';

const ALGOLIA_URL = 'https://8i6wskccnv-dsn.algolia.net/1/indexes/ASDA_PRODUCTS/query';
const APP_ID = '8I6WSKCCNV';
const SEARCH_KEY = '03e4272048dd17f771da37b57ff8a75e'; // public search-only key

const HITS = 100; // top Rollback items; index orders by Asda's own relevance

type AsdaHit = {
  NAME?: string;
  BRAND?: string;
  PACK_SIZE?: string;
  CIN?: string;
  PRICES?: { EN?: { PRICE?: number } };
};

export async function fetchAsdaOffers(): Promise<RawOffer[]> {
  const res = await fetch(ALGOLIA_URL, {
    method: 'POST',
    headers: {
      'x-algolia-application-id': APP_ID,
      'x-algolia-api-key': SEARCH_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      params: `query=&hitsPerPage=${HITS}&facetFilters=${encodeURIComponent('[["LABEL:Rollback"]]')}`,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok)
    throw new Error(`Asda Algolia query -> HTTP ${res.status}`);
  const json = await res.json() as { hits?: AsdaHit[] };

  const out: RawOffer[] = [];
  const seen = new Set<string>();
  for (const h of json.hits ?? []) {
    const price = h.PRICES?.EN?.PRICE;
    if (!h.NAME || price == null)
      continue;
    const key = h.NAME.toLowerCase();
    if (seen.has(key))
      continue;
    seen.add(key);
    out.push({
      retailer_id: 'asda',
      product_name: h.NAME,
      brand: h.BRAND || null,
      price_pence: Math.round(price * 100),
      was_price_pence: null, // not present in the search index
      pack_size: h.PACK_SIZE || null,
      offer_type: 'price_drop',
      source_url: `https://www.asda.com/groceries/search/${encodeURIComponent(h.NAME)}`,
    });
  }

  if (out.length === 0)
    throw new Error('Asda adapter found 0 Rollback products — Algolia key rotated or index/facet renamed');
  return out;
}
