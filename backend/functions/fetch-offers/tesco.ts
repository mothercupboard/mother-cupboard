/**
 * Tesco adapter — Clubcard Prices buylists on the public tesco.com shop.
 *
 * Verified in a real browser on 27 Jul 2026: the buylist pages at
 * tesco.com/shop/en-GB/buylists/clubcard-prices/<category> are fully
 * server-side rendered (~750KB HTML with every tile present — no JS engine
 * needed) and visible signed-out; Clubcard Prices are blanket member prices,
 * the same for everyone (unlike per-account "personalised" offers).
 *
 * Verified tile structure (Tesco "ddsweb" design-system classes — semantic
 * BEM names, far more stable than the hashed suffixes alongside them):
 *
 *   grid:            [data-testid="dynamic-grid"], one child per product,
 *                    each child's data-testid = numeric product id
 *   name:            .ddsweb-heading  e.g. "Tesco 2 Boneless Salmon Fillets 260G"
 *   clubcard price:  .ddsweb-value-bar__content-text  e.g. "£4.00 Clubcard Price"
 *   regular price:   .online-components-product-tile-price__text  e.g. "£5.15"
 *   link:            a[href*="/products/"]
 *
 * We fetch the food-centric buylists only (top picks, fresh, frozen,
 * cupboard) — beer/household/health don't feed recipes. ~24 items per page,
 * first page per buylist, deduped across lists.
 *
 * Tesco runs serious bot protection against datacenter IPs, so requests are
 * routed through the ScraperAPI residential proxy (UK exit) like IE/AU/NZ.
 * A class-agnostic fallback parser runs if the primary finds nothing; if
 * both find 0 the adapter throws rather than writing a silent empty week.
 */

import * as cheerio from 'cheerio';
import { scraperDispatcher } from './proxy';
import type { RawOffer } from './types';

const BASE = 'https://www.tesco.com';

const BUYLISTS = ['top-picks', 'fresh', 'frozen', 'food-cupboard'] as const;

const buylistUrl = (slug: string) =>
  `${BASE}/shop/en-GB/buylists/clubcard-prices/${slug}`;

// Realistic browser headers — Tesco is hostile to honest bot UAs.
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-GB,en;q=0.9',
};

const PRICE_RE = /£\s*(\d+(?:\.\d{1,2})?)/;

function toPence(str: string | undefined | null): number | null {
  const m = PRICE_RE.exec(String(str ?? ''));
  return m ? Math.round(parseFloat(m[1]) * 100) : null;
}

/** "Tesco 2 Boneless Salmon Fillets 260G" -> "260G" (best-effort, else null). */
function packFromName(name: string): string | null {
  const m = /(\d+(?:\.\d+)?\s?(?:x\s?\d+)?\s?(?:g|kg|ml|l|ltr|litres?|pack|pk))\s*$/i.exec(name);
  return m ? m[1].trim() : null;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(45_000), // proxied requests are slower
    dispatcher: scraperDispatcher({ country: 'uk' }),
  } as RequestInit);
  if (!res.ok) throw new Error(`Tesco fetch ${url} -> HTTP ${res.status}`);
  return res.text();
}

// ── Primary parser (verified selectors) ─────────────────────────────────

function parseTiles($: cheerio.CheerioAPI, pageUrl: string): RawOffer[] {
  const out: RawOffer[] = [];
  $('[data-testid="dynamic-grid"] > *').each((_, el) => {
    const t = $(el);
    const name = t.find('.ddsweb-heading').first().text().trim()
      || t.find('a[href*="/products/"]').first().text().trim();
    // The value bar carries the Clubcard price: "£4.00 Clubcard Price".
    const clubcardPrice = toPence(t.find('.ddsweb-value-bar__content-text').first().text());
    if (!name || clubcardPrice == null) return;

    const was = toPence(t.find('.online-components-product-tile-price__text').first().text());
    const href = t.find('a[href*="/products/"]').first().attr('href');
    out.push({
      retailer_id: 'tesco',
      product_name: name,
      brand: null, // Tesco product names carry the brand already
      price_pence: clubcardPrice,
      was_price_pence: was != null && was > clubcardPrice ? was : null,
      pack_size: packFromName(name),
      offer_type: 'loyalty',
      source_url: href ? new URL(href, BASE).href : pageUrl,
    });
  });
  return out;
}

// ── Fallback parser (class-agnostic, survives a class rename) ───────────

function parseFallback($: cheerio.CheerioAPI, pageUrl: string): RawOffer[] {
  const out: RawOffer[] = [];
  $('a[href*="/products/"]').each((_, el) => {
    const a = $(el);
    const name = a.text().trim();
    // Walk up to the smallest ancestor that mentions a Clubcard price.
    const scope = a.parents().filter((__, p) => /Clubcard Price/i.test($(p).text())).first();
    if (!name || scope.length === 0) return;
    const text = scope.text().replace(/\s+/g, ' ');
    const prices = [...text.matchAll(/£\s*\d+(?:\.\d{1,2})?/g)]
      .map(m => toPence(m[0]))
      .filter((p): p is number => p != null && p < 10_000); // ignore £/kg comparators over £100
    if (prices.length === 0) return;
    out.push({
      retailer_id: 'tesco',
      product_name: name,
      brand: null,
      price_pence: Math.min(...prices),
      was_price_pence: prices.length > 1 ? Math.max(...prices) : null,
      pack_size: packFromName(name),
      offer_type: 'loyalty',
      source_url: new URL(a.attr('href') as string, BASE).href,
    });
  });
  return out;
}

// ── Entry point ─────────────────────────────────────────────────────────

export async function fetchTescoOffers(): Promise<RawOffer[]> {
  const results: RawOffer[] = [];
  const errors: string[] = [];

  for (const slug of BUYLISTS) {
    const url = buylistUrl(slug);
    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);
      let items = parseTiles($, url);
      if (items.length === 0) items = parseFallback($, url);
      if (items.length === 0) errors.push(`${slug}: parsed 0 tiles`);
      results.push(...items);
    } catch (err) {
      // One buylist failing shouldn't blank the rest; collect and continue.
      errors.push(`${slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (results.length === 0) {
    throw new Error(
      `Tesco adapter found 0 products across all buylists — page structure changed or bot-blocked [${errors.join(' | ')}]`,
    );
  }

  // De-dup on product name (a product can appear in more than one buylist).
  const seen = new Set<string>();
  return results.filter((o) => {
    const key = o.product_name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
