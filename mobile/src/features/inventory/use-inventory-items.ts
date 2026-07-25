import type { InventoryItem } from '@/lib/database/models/inventory-item';

import { Q } from '@nozbe/watermelondb';

import { useEffect, useState } from 'react';

import { useDatabase } from '@/lib/database/provider';

export function useInventoryItems(location?: 'fridge' | 'freezer' | 'cupboard') {
  const db = useDatabase();
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const conditions = [Q.where('is_deleted', false), Q.where('name', Q.notEq(''))];
    if (location)
      conditions.push(Q.where('location', location));

    // observeWithColumns (not plain observe()) so the list re-emits when a
    // record's columns change — plain observe() only emits when items are
    // added/removed from the result set, which made edits (e.g. a changed
    // expiry date) invisible on the list until something else refreshed it.
    const subscription = db
      .get<InventoryItem>('inventory_items')
      .query(...conditions)
      .observeWithColumns(['name', 'quantity', 'unit', 'location', 'expiry_date', 'expiry_type'])
      .subscribe(setItems);

    return () => subscription.unsubscribe();
  }, [db, location]);

  return items;
}
