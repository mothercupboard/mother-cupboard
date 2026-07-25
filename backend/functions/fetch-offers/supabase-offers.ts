/**
 * Supabase persistence for weekly offer batches.
 *
 * Offers land in the `offers` table (see sql/offers.sql) keyed by ISO week,
 * so re-running a week's fetch upserts rather than duplicates. The app reads
 * the `current_offers` view through its existing Supabase client.
 */

import { createClient } from '@supabase/supabase-js';
import type { MappedOffer } from './types';

/** ISO week key, e.g. "2026-W30" — matches the current_offers view (IYYY-"W"IW). */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function saveOffers(
  offers: MappedOffer[],
): Promise<{ week_key: string; upserted: number }> {
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key);

  const week_key = isoWeekKey();
  const rows = offers.map((o) => ({ ...o, week_key }));

  const { error, count } = await supabase
    .from('offers')
    .upsert(rows, { onConflict: 'retailer_id,product_name,week_key', count: 'exact' });

  if (error) throw new Error(`Supabase offers upsert failed: ${error.message}`);
  return { week_key, upserted: count ?? rows.length };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
