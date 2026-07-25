/**
 * Aldi adapter — direct scrape of the public Super Weekly Offers page.
 *
 * Selectors verified in a real browser on 25 Jul 2026 against
 * aldi.co.uk/super-weekly-offers (Nuxt app, server-side rendered — product
 * tiles are present in the raw HTML, no JS engine needed; 17/17 products
 * parsed correctly on the day):
 *
 *   tile:       [data-test="product-tile"]   (title attribute = product name)
 *   price:      .base-price__regular  or  .base-price__discounted (on sale)
 *   was price:  .base-price__was-price
 *   brand:      .product-tile__brandname
 *   pack size:  .product-tile__selling-size-and-comparison  e.g. "0.8 KG (£22.49/1 KG)"
 *
 * A class-agnostic fallback parser runs if the primary finds nothing (in case
 * Aldi renames classes but keeps SSR). If both find 0 products the adapter
 * throws — a silent empty week would quietly degrade Suggest.
 */

import * as cheerio from 'cheerio';
import type { RawOffer } from './types';

const BASE = 'https://www.aldi.co.uk';

const PAGES: Array<{ url: string; offerType: RawOffer['offer_type'] }> = [
  { url: `${BASE}/super-weekly-offers`, offerType: 'weekly_offer' },
];

const USER_AGENT =
  'MotherCupboard-SaverCupboard/0.1 (weekly offers check; contact: info@theplacespeople.com)';

const PRICE_RE = /£\s*(\d+(?:\.\d{1,2})?)/;

function toPence(str: string | undefined | null): number | null {
  const m = PRICE_RE.exec(String(str ?? ''));
  return m ? Math.round(parseFloat(m[1]) * 100) : null;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Aldi fetch ${url} -> HTTP ${res.status}`);
  return res.text();
}

// ── Primary parser (verified selectors) ─────────────────────────────────

function parseTiles($: cheerio.CheerioAPI, pageUrl: string, offerType: RawOffer['offer_type']): RawOffer[] {
  const out: RawOffer[] = [];
  $('[data-test="product-tile"]').each((_, el) => {
    const t = $(el);
    const name = t.attr('title')?.trim();
    const price =
      toPence(t.find('.base-price__discounted').first().text())
      ?? toPence(t.find('.base-price__regular').first().text());
    if (!name || price == null) return;

    // "0.8 KG (£22.49/1 KG)" -> "0.8 KG"
    const sizeRaw = t.find('.product-tile__selling-size-and-comparison').first().text().trim();
    const packSize = sizeRaw ? sizeRaw.split('(')[0].trim() || null : null;

    const href = t.find('a').first().attr('href');
    out.push({
      retailer_id: 'aldi',
      product_name: name,
      brand: t.find('.product-tile__brandname').first().text().trim() || null,
      price_pence: price,
      was_price_pence: toPence(t.find('.base-price__was-price').first().text()),
      pack_size: packSize,
      offer_type: offerType,
      source_url: href ? new URL(href, BASE).href : pageUrl,
    });
  });
  return out;
}

// ── Fallback parser (class-agnostic, survives a class rename) ───────────

function parseFallback($: cheerio.CheerioAPI, offerType: RawOffer['offer_type']): RawOffer[] {
  const out: RawOffer[] = [];
  $('a[href*="/product/"]').each((_, el) => {
    const a = $(el);
    const scope = a.closest('div');
    const text = scope.text().replace(/\s+/g, ' ');
    const prices = [...text.matchAll(/£\s*\d+(?:\.\d{1,2})?/g)]
      .map((m) => toPence(m[0]))
      .filter((p): p is number => p != null);
    const name = a.attr('title') ?? scope.attr('title');
    if (name && prices.length > 0) {
      out.push({
        retailer_id: 'aldi',
        product_name: name.trim(),
        brand: null,
        price_pence: Math.min(...prices),
        was_price_pence: prices.length > 1 ? Math.max(...prices) : null,
        pack_size: null,
        offer_type: offerType,
        source_url: new URL(a.attr('href') as string, BASE).href,
      });
    }
  });
  return out;
}

// ── Entry point ─────────────────────────────────────────────────────────

export async function fetchAldiOffers(): Promise<RawOffer[]> {
  const results: RawOffer[] = [];
  for (const page of PAGES) {
    const html = await fetchPage(page.url);
    const $ = cheerio.load(html);
    let items = parseTiles($, page.url, page.offerType);
    if (items.length === 0) items = parseFallback($, page.offerType);
    if (items.length === 0) {
      throw new Error(
        `Aldi adapter found 0 products at ${page.url} — page structure changed or SSR removed; inspect and update selectors`,
      );
    }
    results.push(...items);
  }

  // De-dup on product name (a product can appear in more than one section).
  const seen = new Set<string>();
  return results.filter((o) => {
    const key = o.product_name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
