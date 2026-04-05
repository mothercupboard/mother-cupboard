// Inventory item types — aligned with WatermelonDB schema and Supabase table (Story 1.5)

export type ItemLocation = 'fridge' | 'freezer' | 'cupboard';
export type ExpiryType = 'use_by' | 'best_before';

/**
 * Canonical inventory item shape.
 * - Used as the Supabase row type and as the WatermelonDB sync record shape.
 * - Timestamps are unix milliseconds (bigint in Postgres, number in WatermelonDB).
 */
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  location: ItemLocation;
  expiryDate: number | null;     // unix ms
  expiryType: ExpiryType | null;
  barcode: string | null;
  category: string | null;
  notes: string | null;
  isDeleted: boolean;
  createdAt: number;             // unix ms
  updatedAt: number;             // unix ms
}

/** Computed status used to drive expiry badge colour in the UI */
export type ExpiryStatus = 'ok' | 'warning' | 'urgent' | 'past';

export interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
}
