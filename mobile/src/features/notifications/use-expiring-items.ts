import type { InventoryItem } from '@/lib/database/models/inventory-item';

import { Q } from '@nozbe/watermelondb';
import { useEffect, useState } from 'react';

import { useDatabase } from '@/lib/database/provider';

/**
 * Subscribes to inventory items that have an expiry badge — use_by within 2
 * days (including recently past) or best_before within 3 days.
 *
 * Returns a live-updating array suitable for the home-screen nudge card.
 */
export function useExpiringItems(): InventoryItem[] {
  const db = useDatabase();
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // use_by: from 3 days ago (past-use-by amber/grey) up to end of tomorrow
    const useByFloor = startOfToday - 3 * 86_400_000;
    const useByceiling = startOfToday + 2 * 86_400_000;

    // best_before: today through 3 days from now
    const bbFloor = startOfToday;
    const bbCeiling = startOfToday + 3 * 86_400_000;

    const subscription = db
      .get<InventoryItem>('inventory_items')
      .query(
        Q.where('is_deleted', false),
        Q.where('expiry_date', Q.notEq(null)),
        Q.or(
          Q.and(
            Q.where('expiry_type', 'use_by'),
            Q.where('expiry_date', Q.gte(useByFloor)),
            Q.where('expiry_date', Q.lt(useByceiling)),
          ),
          Q.and(
            Q.where('expiry_type', 'best_before'),
            Q.where('expiry_date', Q.gt(bbFloor)),
            Q.where('expiry_date', Q.lte(bbCeiling)),
          ),
        ),
      )
      .observe()
      .subscribe(setItems);

    return () => subscription.unsubscribe();
  }, [db]);

  return items;
}
