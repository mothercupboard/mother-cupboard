import type { InventoryItem } from '@/lib/database/models/inventory-item';

import { Q } from '@nozbe/watermelondb';

import { useEffect, useState } from 'react';

import { useDatabase } from '@/lib/database/provider';

export function useInventoryItems(location?: 'fridge' | 'freezer' | 'cupboard') {
  const db = useDatabase();
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const conditions = [Q.where('is_deleted', false)];
    if (location)
      conditions.push(Q.where('location', location));

    const subscription = db
      .get<InventoryItem>('inventory_items')
      .query(...conditions)
      .observe()
      .subscribe(setItems);

    return () => subscription.unsubscribe();
  }, [db, location]);

  return items;
}
