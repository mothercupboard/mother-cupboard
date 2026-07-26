/**
 * Aldi Ireland adapter — the "Savers" grocery-deals page.
 *
 * aldi.ie runs the SAME Nuxt/SSR platform as aldi.co.uk (verified in a real
 * browser, 25 Jul 2026): identical tile markup, so the UK parser transfers
 * verbatim — only the base URL and currency differ. The Savers page is
 * Ireland's equivalent of the UK's Super Weekly Offers: 30 grocery items,
 * every one carrying a genuine was-price (€ discounts), e.g.
 * "The Fishmonger Tuna Chunks in Brine €0.79 was €0.89".
 *
 *   page:  https://www.aldi.ie/products/savers/k/1588161433155116
 *   tile:  [data-test="product-tile"]  (title attr = product name)
 *   price: .base-price__regular / .base-price__discounted
 *   was:   .base-price__was-price
 *   brand: .product-tile__brandname
 *   size:  .product-tile__selling-size-and-comparison
 *
 * Prices are euros → stored as integer cents in the same minor-units column
 * as UK pence. Throws loudly on 0 products (SSR removed / category id moved).
 */

import * as cheerio from 'cheerio';
import type { RawOffer } from './types';

const BASE = 'https://www.aldi.ie';
// The "Savers" category id is stable week to week; the weekly line-up changes.
const SAVERS_URL = `${BASE}/products/savers/k/1588161433155116`;

// Real browser headers — the honest bot UA can trip European Aldi's edge.
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-IE,en;q=0.9',
};

const PRICE_RE = /€\s*(\d+(?:\.\d{1,2})?)/;

function toCents(str: string | undefined | null): number | null {
  const m = PRICE_RE.exec(String(str ?? ''));
  return m ? Math.round(parseFloat(m[1]) * 100) : null;
}

export async function fetchAldiIeOffers(): Promise<RawOffer[]> {
  const res = await fetch(SAVERS_URL, {
    headers: HEADERS,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok)
    throw new Error(`Aldi IE fetch -> HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());

  const out: RawOffer[] = [];
  const seen = new Set<string>();

  $('[data-test="product-tile"]').each((_, el) => {
    const t = $(el);
    const name = t.attr('title')?.trim();
    const price =
      toCents(t.find('.base-price__discounted').first().text())
      ?? toCents(t.find('.base-price__regular').first().text());
    if (!name || price == null)
      return;

    const key = name.toLowerCase();
    if (seen.has(key))
      return;
    seen.add(key);

    const sizeRaw = t.find('.product-tile__selling-size-and-comparison').first().text().trim();
    const href = t.find('a').first().attr('href');

    out.push({
      retailer_id: 'aldi_ie',
      product_name: name,
      brand: t.find('.product-tile__brandname').first().text().trim() || null,
      price_pence: price,
      was_price_pence: toCents(t.find('.base-price__was-price').first().text()),
      pack_size: sizeRaw ? sizeRaw.split('(')[0].trim() || null : null,
      offer_type: 'weekly_offer',
      source_url: href ? new URL(href, BASE).href : SAVERS_URL,
    });
  });

  if (out.length === 0)
    throw new Error(`Aldi IE adapter found 0 products at ${SAVERS_URL} — SSR removed or category id changed`);
  return out;
}
