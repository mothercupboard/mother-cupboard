import { useQuery } from '@tanstack/react-query';

import { useSaverStore } from '@/features/saver/saver-store';
import { getActiveRegion, useRegionStore } from '@/lib/region';
import { supabase } from '@/lib/supabase/client';

/** A row from the Supabase `retailers` table. */
export type Retailer = {
  id: string;
  display_name: string;
  enabled: boolean;
  country: string;
};

/** One of this week's food offers, with the retailer name resolved. */
export type CurrentOffer = {
  id: string;
  retailer_id: string;
  retailer_name: string;
  product_name: string;
  brand: string | null;
  price_pence: number;
  was_price_pence: number | null;
  pack_size: string | null;
  canonical_ingredient: string | null;
  ingredient_category: string | null;
  /** Retailer's product page, when the source had one. */
  source_url: string | null;
};

/**
 * ISO week key matching the backend's fetch-offers batches, e.g. "2026-W30".
 * Computed client-side so the app queries the `offers` table directly.
 */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Retailers Saver Cupboard currently has offer data for IN THE USER'S REGION —
 * an NZ user sees Woolworths and PAK'nSAVE, a UK user sees Aldi, never a mix.
 * Driven by the backend `retailers` table so new supermarkets appear in the
 * picker without an app release.
 */
export function useRetailers() {
  const region = useRegionStore(s => s.region);
  return useQuery<Retailer[], Error>({
    queryKey: ['saver', 'retailers', region],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retailers')
        .select('id, display_name, enabled, country')
        .eq('enabled', true)
        .eq('country', region)
        .order('display_name');
      if (error)
        throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 24 * 60 * 60 * 1000, // retailer list changes rarely
  });
}

/**
 * This week's COOKABLE offers at the user's chosen supermarket(s), straight
 * from the `offers` table: this ISO week, is_food, and is_ingredient — i.e.
 * things that plausibly appear on a recipe's ingredient list. Snacks,
 * biscuits, tea bags etc. stay in the table but aren't surfaced (they'd
 * never make a dish). Rows with is_ingredient null (mapped before the flag
 * existed) are still included so old weeks keep working.
 *
 * Ordered by BIGGEST SAVING first — "was £5.15, now £4" is what draws the
 * user in — with offers that have no was-price after those, cheapest first.
 * Savings are computed client-side (PostgREST can't order by an expression),
 * so the query pulls a generous sample and the strip keeps the top 80.
 * Returns an empty list (and never fetches) when no supermarket is chosen,
 * so everything downstream degrades gracefully to pre-Saver behaviour.
 */
export function useCurrentOffers() {
  const retailerIds = useSaverStore(s => s.retailerIds);
  const { data: retailers } = useRetailers();

  // Only fetch offers for chosen retailers that exist in the user's current
  // region — a leftover Aldi tick shouldn't surface UK offers after switching
  // the app to New Zealand.
  const regionIds = retailers ? new Set(retailers.map(r => r.id)) : null;
  const activeIds = regionIds ? retailerIds.filter(id => regionIds.has(id)) : retailerIds;

  const query = useQuery<Omit<CurrentOffer, 'retailer_name'>[], Error>({
    queryKey: ['saver', 'current-offers', isoWeekKey(), [...activeIds].sort()],
    enabled: activeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('id, retailer_id, product_name, brand, price_pence, was_price_pence, pack_size, canonical_ingredient, ingredient_category, source_url')
        .eq('week_key', isoWeekKey())
        .eq('is_food', true)
        // Cookable items only; null = pre-flag rows, kept for compatibility.
        .or('is_ingredient.is.null,is_ingredient.eq.true')
        .in('retailer_id', activeIds)
        .order('price_pence')
        .limit(250);
      if (error)
        throw new Error(error.message);
      // Biggest saving first; no-was-price offers after, cheapest first.
      const saving = (o: Omit<CurrentOffer, 'retailer_name'>) =>
        o.was_price_pence != null ? o.was_price_pence - o.price_pence : -1;
      return (data ?? [])
        .sort((a, b) => (saving(b) - saving(a)) || (a.price_pence - b.price_pence))
        .slice(0, 80);
    },
    staleTime: 60 * 60 * 1000, // offers change weekly; an hour is plenty fresh
  });

  const nameById = new Map((retailers ?? []).map(r => [r.id, r.display_name]));
  const data: CurrentOffer[] | undefined = query.data?.map(o => ({
    ...o,
    retailer_name: nameById.get(o.retailer_id)
      ?? o.retailer_id.charAt(0).toUpperCase() + o.retailer_id.slice(1),
  }));

  return { ...query, data };
}

/**
 * Format an offer price (integer minor units) in the active region's currency:
 * GB 65 -> "65p", GB 299 -> "£2.99", NZ 1199 -> "$11.99".
 */
export function formatOfferPrice(minorUnits: number): string {
  const region = getActiveRegion();
  if (region.currency === 'GBP' && minorUnits < 100)
    return `${minorUnits}p`;
  try {
    return new Intl.NumberFormat(region.locale, {
      style: 'currency',
      currency: region.currency,
    }).format(minorUnits / 100);
  }
  catch {
    return `${(minorUnits / 100).toFixed(2)}`;
  }
}
