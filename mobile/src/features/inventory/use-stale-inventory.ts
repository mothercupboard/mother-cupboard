import type { InventoryItem } from '@/lib/database/models/inventory-item';

import { Q } from '@nozbe/watermelondb';
import { useEffect, useState } from 'react';

import { useDatabase } from '@/lib/database/provider';

export type StalenessState
  = | { status: 'loading' }
    | { status: 'empty' }
    | { status: 'fresh'; daysSinceUpdate: number }
    | { status: 'stale'; daysSinceUpdate: number };

/** Number of days without any inventory change before we consider it stale. */
const STALE_THRESHOLD_DAYS = 7;

/**
 * Subscribes to the inventory and derives whether it is "stale" — i.e. no
 * item has been created or updated in the last {@link STALE_THRESHOLD_DAYS}
 * days. Returns a discriminated union so the UI can show different states.
 */
export function useStaleInventory(): StalenessState {
  const db = useDatabase();
  const [state, setState] = useState<StalenessState>({ status: 'loading' });

  useEffect(() => {
    const subscription = db
      .get<InventoryItem>('inventory_items')
      .query(Q.where('is_deleted', false), Q.sortBy('updated_at', Q.desc), Q.take(1))
      .observe()
      .subscribe((rows) => {
        if (rows.length === 0) {
          setState({ status: 'empty' });
          return;
        }

        const lastUpdated = rows[0].updatedAt.getTime();
        const daysSinceUpdate = Math.floor((Date.now() - lastUpdated) / 86_400_000);

        setState(
          daysSinceUpdate >= STALE_THRESHOLD_DAYS
            ? { status: 'stale', daysSinceUpdate }
            : { status: 'fresh', daysSinceUpdate },
        );
      });

    return () => subscription.unsubscribe();
  }, [db]);

  return state;
}
