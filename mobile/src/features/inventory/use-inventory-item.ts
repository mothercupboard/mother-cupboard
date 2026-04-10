import type { InventoryItem } from '@/lib/database/models/inventory-item';

import { useEffect, useState } from 'react';

import { useDatabase } from '@/lib/database/provider';

export function useInventoryItem(id: string) {
  const db = useDatabase();
  const [item, setItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const subscription = db
      .get<InventoryItem>('inventory_items')
      .findAndObserve(id)
      .subscribe(setItem);

    return () => subscription.unsubscribe();
  }, [db, id]);

  return item;
}
