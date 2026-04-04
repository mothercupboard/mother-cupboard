// Inventory / pantry item types — populated in Story 2.x
export type ExpiryStatus = 'ok' | 'warning' | 'urgent' | 'past';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  bestBefore?: string; // ISO date string
  useBy?: string;      // ISO date string
  expiryStatus: ExpiryStatus;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
}
