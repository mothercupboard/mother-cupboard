/**
 * Tesco Ireland adapter — Clubcard Prices from the public promotions pages.
 *
 * Verified in a real browser on 27 Jul 2026: tesco.ie redirects to the SAME
 * new shop platform as tesco.com (shop/en-IE), and /shop/en-IE/promotions/all
 * is fully server-side rendered (~930KB, 410 tile mentions, 132 "Clubcard
 * Price" mentions, € prices). Unlike GB there are no curated
 * clubcard-prices buylists (that path returns a shell), so we parse the
 * promotions pages and KEEP ONLY tiles whose value bar shows a Clubcard
 * Price — multibuy tiles ("Any 3 for €8") are skipped.
 *
 * Verified tile structure (27 Jul, DIFFERENT from the GB buylists — there is
 * no dynamic-grid here):
 *   tile:           section[data-testid^="product-"]  (e.g. product-258421636)
 *   name:           the section's aria-label — e.g. "Tesco Red Peppers Each".
 *                   NB there are TWO product links per tile (image + title);
 *                   the image link's text is empty, so reading link text
 *                   silently dropped every tile — aria-label is the reliable
 *                   source (confirmed against raw SSR HTML 27 Jul).
 *   clubcard price: .ddsweb-value-bar__content-text — "€1.50 Clubcard Price"
 *                   or, under €1, CENT format: "79c Clubcard Price"
 *   was price:      .online-components-product-tile-price__text  "€0.99"
 *
 * Routed through the ScraperAPI residential proxy (EU exit, like Aldi IE).
 * Prices are EUR, stored as integer cents in the shared minor-units column.
 */

import * as cheerio from 'cheerio';
import { scraperDispatcher, withRetry } from './proxy';
import type { RawOffer } from './types';

const BASE = 'https://www.tesco.ie';
const PAGES = 3; // ~27 tiles/page, clubcard-only subset after filtering

const promoUrl = (page: number) =>
  `${BASE}/shop/en-IE/promotions/all${page > 1 ? `?page=${page}` : ''}`;

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-IE,en;q=0.9',
};

const EURO_RE = /€\s*(\d+(?:\.\d{1,2})?)/;
const CENT_RE = /(?:^|\s)(\d{1,2})\s*c\b/; // "79c Clubcard Price" (sub-€1 prices)

function toCents(str: string | undefined | null): number | null {
  const s = String(str ?? '');
  const euro = EURO_RE.exec(s);
  if (euro) return Math.round(parseFloat(euro[1]) * 100);
  const cent = CENT_RE.exec(s);
  return cent ? parseInt(cent[1], 10) : null;
}

/** "Tesco Irish Chicken Breast Fillets 291G" -> "291G" (best-effort). */
function packFromName(name: string): string | null {
  const m = /(\d+(?:\.\d+)?\s?(?:x\s?\d+)?\s?(?:g|kg|ml|l|ltr|litres?|pack|pk))\s*$/i.exec(name);
  return m ? m[1].trim() : null;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(70_000), // ScraperAPI residential can be slow under load; their docs suggest ~70s
    // via 'scraperapi': all three pages 403 through a plain residential proxy
    // even on Irish IPs — see the note on scraperDispatcher in proxy.ts.
    dispatcher: scraperDispatcher({ country: 'eu', via: 'scraperapi' }),
  } as RequestInit);
  if (!res.ok) throw new Error(`Tesco IE fetch ${url} -> HTTP ${res.status}`);
  return res.text();
}

function parseTiles($: cheerio.CheerioAPI, pageUrl: string): RawOffer[] {
  const out: RawOffer[] = [];
  $('section[data-testid^="product-"]').each((_, el) => {
    const t = $(el);
    const valueBarText = t.find('.ddsweb-value-bar__content-text').first().text();
    // Clubcard tiles only — multibuys and plain offers are skipped.
    if (!/Clubcard Price/i.test(valueBarText)) return;
    // Name from the section's aria-label — the image link's text is empty,
    // so link text silently drops every tile (see header note). Fall back to
    // any non-empty product-link text if a future page drops the aria-label.
    const name = (t.attr('aria-label') ?? '').trim()
      || t.find('a[href*="/products/"]').map((_i, a) => $(a).text().trim()).get().find(Boolean)
      || '';
    const clubcardPrice = toCents(valueBarText);
    if (!name || clubcardPrice == null) return;

    const was = toCents(t.find('.online-components-product-tile-price__text').first().text());
    const href = t.find('a[href*="/products/"]').first().attr('href');
    out.push({
      retailer_id: 'tesco_ie',
      product_name: name,
      brand: null,
      price_pence: clubcardPrice, // EUR cents
      was_price_pence: was != null && was > clubcardPrice ? was : null,
      pack_size: packFromName(name),
      offer_type: 'loyalty',
      source_url: href ? new URL(href, BASE).href : pageUrl,
    });
  });
  return out;
}

export async function fetchTescoIeOffers(): Promise<RawOffer[]> {
  const results: RawOffer[] = [];
  const errors: string[] = [];

  for (let page = 1; page <= PAGES; page++) {
    const url = promoUrl(page);
    try {
      const html = await withRetry(() => fetchPage(url));
      const $ = cheerio.load(html);
      const items = parseTiles($, url);
      if (items.length === 0) {
        // A geo/consent/interstitial page looks like success (HTTP 200) but
        // parses to nothing — surface enough to tell which it was.
        const title = $('title').first().text().trim().slice(0, 60);
        const sections = $('section[data-testid^="product-"]').length;
        errors.push(`page ${page}: 0 clubcard tiles (sections=${sections}) in ${html.length}B page titled "${title}"`);
      }
      results.push(...items);
    } catch (err) {
      errors.push(`page ${page}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (results.length === 0) {
    throw new Error(
      `Tesco IE adapter found 0 Clubcard Price products — page structure changed or bot-blocked [${errors.join(' | ')}]`,
    );
  }

  const seen = new Set<string>();
  return results.filter((o) => {
    const key = o.product_name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
