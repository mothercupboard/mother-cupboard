import type { InventoryItem } from '@/lib/database/models/inventory-item';

import { Q } from '@nozbe/watermelondb';
import { useState } from 'react';

import { useDatabase } from '@/lib/database/provider';

/**
 * Matches ingredient names (from an AI suggestion) against inventory items
 * using case-insensitive substring matching, then soft-deletes the matches.
 */
export function useMarkAsCooked() {
  const db = useDatabase();
  const [isMarking, setIsMarking] = useState(false);

  async function markAsCooked(ingredientNames: string[]): Promise<number> {
    setIsMarking(true);
    try {
      const allItems = await db
        .get<InventoryItem>('inventory_items')
        .query(Q.where('is_deleted', false))
        .fetch();

      const normalised = ingredientNames.map(n => n.toLowerCase());

      // Match inventory items whose name contains any of the ingredient strings
      const matched = allItems.filter((item) => {
        const itemName = item.name.toLowerCase();
        return normalised.some(
          ing => itemName.includes(ing) || ing.includes(itemName),
        );
      });

      if (matched.length > 0) {
        await db.write(async () => {
          await db.batch(
            ...matched.map(item =>
              item.prepareMarkAsDeleted(),
            ),
          );
        });
      }

      return matched.length;
    }
    finally {
      setIsMarking(false);
    }
  }

  return { isMarking, markAsCooked };
}
