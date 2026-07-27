/**
 * Saver Cupboard — weekly offers fetch.
 *
 * Runs on a schedule (Monday 05:00 UTC, see serverless.yml). Fetches the
 * week's offers from each enabled retailer, maps products to canonical
 * ingredients, and upserts the batch into Supabase, where the app reads
 * the `current_offers` view.
 *
 * Retailers fail independently — one broken adapter never blanks the others.
 *
 * Retailer status (27 Jul 2026):
 *   GB: aldi (direct), tesco / sainsburys / morrisons (proxied APIs+SSR),
 *       asda (direct via public Algolia index — no proxy needed)
 *   IE: aldi_ie, tesco_ie, supervalu (proxied, EUR cents)
 *   AU: woolworths_au (proxied)  ·  NZ: woolworths_nz (proxied)
 *   lidl — no scrapeable web data (offers are Lidl Plus app-only);
 *          planned route is in-app leaflet scanning, not this Lambda
 *   paknsave / newworld (NZ), coles (AU) — parked: Kasada/Incapsula bot
 *          walls need a headless browser (ScraperAPI render mode, someday)
 */

import type { ScheduledEvent } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';
import { createClient } from '@supabase/supabase-js';
import { fetchAldiOffers } from './aldi';
import { fetchAldiIeOffers } from './aldi-ie';
import { fetchAsdaOffers } from './asda';
import { mapIngredients } from './map-ingredients';
import { fetchMorrisonsOffers } from './morrisons';
import { fetchPaknsaveOffers } from './paknsave';
import { fetchSainsburysOffers } from './sainsburys';
import { fetchSupervaluOffers } from './supervalu';
import { saveOffers } from './supabase-offers';
import { fetchTescoOffers } from './tesco';
import { fetchTescoIeOffers } from './tesco-ie';
import type { RawOffer, RetailerId } from './types';
import { fetchWoolworthsAuOffers } from './woolworths-au';
import { fetchWoolworthsNzOffers } from './woolworths-nz';

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.STAGE ?? 'development',
  tracesSampleRate: 0.2,
});

const FETCHERS: Partial<Record<RetailerId, () => Promise<RawOffer[]>>> = {
  aldi: fetchAldiOffers,
  tesco: fetchTescoOffers,
  sainsburys: fetchSainsburysOffers,
  morrisons: fetchMorrisonsOffers,
  asda: fetchAsdaOffers,
  aldi_ie: fetchAldiIeOffers,
  tesco_ie: fetchTescoIeOffers,
  supervalu: fetchSupervaluOffers,
  woolworths_nz: fetchWoolworthsNzOffers,
  paknsave: fetchPaknsaveOffers,
  woolworths_au: fetchWoolworthsAuOffers,
};

interface RunSummary {
  retailers: Record<string, { fetched: number } | { error: string }>;
  week_key?: string;
  upserted?: number;
  food_items?: number;
}

/**
 * Which retailers to actually fetch this run: the intersection of retailers
 * marked enabled in the DB and those we have a fetcher for. Reading the DB
 * means the `enabled` flag is the single source of truth — disabling a
 * retailer (e.g. bot-blocked PAK'nSAVE) stops the weekly fetch too, and we
 * never produce offers for a retailer_id that has no row (which would fail
 * the whole upsert on the foreign key).
 */
async function enabledRetailerIds(): Promise<RetailerId[]> {
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );
  const { data, error } = await supabase
    .from('retailers')
    .select('id')
    .eq('enabled', true);
  if (error)
    throw new Error(`Could not read retailers: ${error.message}`);
  return (data ?? []).map(r => r.id as RetailerId);
}

export const handler = Sentry.AWSLambda.wrapHandler(
  async (_event: ScheduledEvent): Promise<RunSummary> => {
    const summary: RunSummary = { retailers: {} };
    const allOffers: RawOffer[] = [];

    const enabled = await enabledRetailerIds();
    // Only run fetchers for retailers that are enabled AND implemented.
    const toRun = enabled.filter((id): id is RetailerId => FETCHERS[id] != null);

    for (const retailerId of toRun) {
      try {
        const offers = await FETCHERS[retailerId]!();
        allOffers.push(...offers);
        summary.retailers[retailerId] = { fetched: offers.length };
      } catch (err) {
        // Loud but isolated: report it, carry on with the other retailers.
        Sentry.captureException(err);
        console.error(`[fetch-offers] ${retailerId} failed:`, err);
        // Surface the underlying cause — undici wraps the real reason (407,
        // ECONNREFUSED, TLS, etc.) as `fetch failed` with the detail on .cause.
        const cause = (err as { cause?: unknown })?.cause;
        const causeStr = cause
          ? ` | cause: ${(cause as { code?: string })?.code ?? ''} ${(cause as Error)?.message ?? String(cause)}`.trim()
          : '';
        summary.retailers[retailerId] = {
          error: (err instanceof Error ? err.message : String(err)) + causeStr,
        };
      }
    }

    if (allOffers.length > 0) {
      const mapped = await mapIngredients(allOffers);
      const { week_key, upserted } = await saveOffers(mapped);
      summary.week_key = week_key;
      summary.upserted = upserted;
      summary.food_items = mapped.filter((o) => o.is_food === true).length;
    }

    console.log('[fetch-offers] run summary', JSON.stringify(summary));
    return summary;
  },
);
