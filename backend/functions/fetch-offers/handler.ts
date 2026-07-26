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
 * Retailer status (25 Jul 2026):
 *   aldi  — live, direct scrape (verified selectors, see ./aldi.ts)
 *   lidl  — no scrapeable web data (offers are Lidl Plus app-only);
 *           planned route is in-app leaflet scanning, not this Lambda
 *   tesco / sainsburys / asda — parked; Pepesto data API when demand shows
 */

import type { ScheduledEvent } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';
import { fetchAldiOffers } from './aldi';
import { mapIngredients } from './map-ingredients';
import { fetchPaknsaveOffers } from './paknsave';
import { saveOffers } from './supabase-offers';
import type { RawOffer, RetailerId } from './types';
import { fetchWoolworthsNzOffers } from './woolworths-nz';

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.STAGE ?? 'development',
  tracesSampleRate: 0.2,
});

const FETCHERS: Partial<Record<RetailerId, () => Promise<RawOffer[]>>> = {
  aldi: fetchAldiOffers,
  woolworths_nz: fetchWoolworthsNzOffers,
  paknsave: fetchPaknsaveOffers,
};

interface RunSummary {
  retailers: Record<string, { fetched: number } | { error: string }>;
  week_key?: string;
  upserted?: number;
  food_items?: number;
}

export const handler = Sentry.AWSLambda.wrapHandler(
  async (_event: ScheduledEvent): Promise<RunSummary> => {
    const summary: RunSummary = { retailers: {} };
    const allOffers: RawOffer[] = [];

    for (const [retailerId, fetcher] of Object.entries(FETCHERS)) {
      try {
        const offers = await fetcher();
        allOffers.push(...offers);
        summary.retailers[retailerId] = { fetched: offers.length };
      } catch (err) {
        // Loud but isolated: report it, carry on with the other retailers.
        Sentry.captureException(err);
        console.error(`[fetch-offers] ${retailerId} failed:`, err);
        summary.retailers[retailerId] = { error: err instanceof Error ? err.message : String(err) };
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
