import { useQuery } from '@tanstack/react-query';

import { useSaverStore } from '@/features/saver/saver-store';
import { supabase } from '@/lib/supabase/client';

/** A row from the Supabase `retailers` table. */
export type Retailer = {
  id: string;
  display_name: string;
  enabled: boolean;
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
 * Retailers Saver Cupboard currently has offer data for.
 * Driven by the backend `retailers` table so new supermarkets appear in the
 * picker without an app release.
 */
export function useRetailers() {
  return useQuery<Retailer[], Error>({
    queryKey: ['saver', 'retailers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retailers')
        .select('id, display_name, enabled')
        .eq('enabled', true)
        .order('display_name');
      if (error)
        throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 24 * 60 * 60 * 1000, // retailer list changes rarely
  });
}

/**
 * This week's food offers at the user's chosen supermarket(s), straight from
 * the `offers` table (filtered to this ISO week and is_food). Returns an
 * empty list (and never fetches) when no supermarket is chosen, so
 * everything downstream degrades gracefully to pre-Saver behaviour.
 */
export function useCurrentOffers() {
  const retailerIds = useSaverStore(s => s.retailerIds);
  const { data: retailers } = useRetailers();

  const query = useQuery<Omit<CurrentOffer, 'retailer_name'>[], Error>({
    queryKey: ['saver', 'current-offers', isoWeekKey(), [...retailerIds].sort()],
    enabled: retailerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('id, retailer_id, product_name, brand, price_pence, was_price_pence, pack_size, canonical_ingredient, ingredient_category, source_url')
        .eq('week_key', isoWeekKey())
        .eq('is_food', true)
        .in('retailer_id', retailerIds)
        .order('price_pence');
      if (error)
        throw new Error(error.message);
      return data ?? [];
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

/** Format pence for chips: 65 -> "65p", 299 -> "£2.99". */
export function formatOfferPrice(pence: number): string {
  return pence < 100 ? `${pence}p` : `£${(pence / 100).toFixed(2)}`;
}
