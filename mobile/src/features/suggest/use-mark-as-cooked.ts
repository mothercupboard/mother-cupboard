import type { InventoryItem } from '@/lib/database/models/inventory-item';

import { Q } from '@nozbe/watermelondb';
import { useState } from 'react';

import { useDatabase } from '@/lib/database/provider';

import { parseIngredient } from './ingredient-parser';
import { isStaple, useStaplesStore } from './staples-store';

export type CookResult = {
  /** Items fully depleted and soft-deleted. */
  removedCount: number;
  /** Items partially deducted (quantity reduced but not deleted). */
  updatedCount: number;
  /** Raw ingredient strings where stock ran short (for adding to shopping list). */
  shortfallItems: string[];
};

// ─── Unit helpers ────────────────────────────────────────────────────────────

const WEIGHT_UNITS = new Set(['g', 'kg']);
const VOLUME_UNITS = new Set(['ml', 'l']);

/** Returns true if two units can be arithmetically compared / converted. */
function sameUnitFamily(unit1: string, unit2: string): boolean {
  if (unit1 === unit2)
    return true;
  return (
    (WEIGHT_UNITS.has(unit1) && WEIGHT_UNITS.has(unit2))
    || (VOLUME_UNITS.has(unit1) && VOLUME_UNITS.has(unit2))
  );
}

/** Converts a quantity to the base unit (g for weight, ml for volume). */
function toBase(quantity: number, unit: string): number {
  if (unit === 'kg')
    return quantity * 1000;
  if (unit === 'l')
    return quantity * 1000;
  return quantity;
}

/** Converts from the base unit back to the target unit. */
function fromBase(base: number, unit: string): number {
  if (unit === 'kg')
    return base / 1000;
  if (unit === 'l')
    return base / 1000;
  return base;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

function matchesIngredient(itemName: string, ingredientName: string): boolean {
  const item = itemName.toLowerCase().trim();
  const ing = ingredientName.toLowerCase().trim();
  return item.includes(ing) || ing.includes(item);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Deducts recipe ingredients from inventory when a meal is marked as cooked.
 *
 * Rules:
 *  - Staples (user-configurable in Settings → Kitchen Staples): skipped entirely.
 *  - Measured ingredients with matching units: quantity is deducted.
 *    · If stock runs out: item is soft-deleted and raw string added to shortfallItems.
 *    · If units are incompatible (e.g. "1 tbsp" vs "500g"): skipped, not deleted.
 *  - Ingredients with no parseable quantity, or where inventory has no quantity: soft-deleted.
 */
export function useMarkAsCooked() {
  const db = useDatabase();
  const staples = useStaplesStore(s => s.enabled);
  const [isMarking, setIsMarking] = useState(false);

  async function markAsCooked(ingredientStrings: string[]): Promise<CookResult> {
    setIsMarking(true);
    try {
      const allItems = await db
        .get<InventoryItem>('inventory_items')
        .query(Q.where('is_deleted', false))
        .fetch();

      const toDelete: InventoryItem[] = [];
      const toUpdate: Array<{ item: InventoryItem; newQuantity: number }> = [];
      const shortfallItems: string[] = [];

      for (const raw of ingredientStrings) {
        const ingredient = parseIngredient(raw);

        // Staples (user-configurable): always skip
        if (isStaple(ingredient.name, staples))
          continue;

        const match = allItems.find(item =>
          matchesIngredient(item.name, ingredient.name),
        );

        // Not in inventory — nothing to deduct
        if (!match)
          continue;

        // No quantity info on the ingredient side — soft-delete the matched item
        if (ingredient.quantity === null || ingredient.unit === null) {
          toDelete.push(match);
          continue;
        }

        // Inventory item has no quantity — can't do arithmetic, leave it alone
        if (match.quantity === null || match.unit === null)
          continue;

        // Units are from different families (e.g. "tbsp" vs "g") — skip, don't guess
        if (!sameUnitFamily(ingredient.unit, match.unit))
          continue;

        // Convert both to base unit, subtract, convert back
        const recipeBase = toBase(ingredient.quantity, ingredient.unit);
        const stockBase = toBase(match.quantity, match.unit);
        const remaining = stockBase - recipeBase;

        if (remaining <= 0) {
          // Fully used up (or went over)
          toDelete.push(match);
          if (remaining < 0)
            shortfallItems.push(raw);
        }
        else {
          // Partial deduction — update quantity, rounded to 2 decimal places
          toUpdate.push({
            item: match,
            newQuantity: Math.round(fromBase(remaining, match.unit) * 100) / 100,
          });
        }
      }

      if (toDelete.length > 0 || toUpdate.length > 0) {
        await db.write(async () => {
          await db.batch(
            ...toDelete.map(item => item.prepareMarkAsDeleted()),
            ...toUpdate.map(({ item, newQuantity }) =>
              item.prepareUpdate((record: InventoryItem) => {
                record.quantity = newQuantity;
              }),
            ),
          );
        });
      }

      return {
        removedCount: toDelete.length,
        updatedCount: toUpdate.length,
        shortfallItems,
      };
    }
    finally {
      setIsMarking(false);
    }
  }

  return { isMarking, markAsCooked };
}
