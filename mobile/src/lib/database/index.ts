import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { InventoryItem } from './models/inventory-item';
import { databaseSchema } from './schema';

const adapter = new SQLiteAdapter({
  schema: databaseSchema,
  // JSI is required for WatermelonDB under the New Architecture (Expo SDK 54).
  // Without it, Android writes silently fall back to a no-op bridge mode.
  jsi: true,
  onSetUpError: (error) => {
    // Surfaces DB init failures instead of failing silently.
    console.error('[WatermelonDB] setup failed:', error);
  },
  // migrations: [] — add here in future stories when schema changes
});

export const database = new Database({
  adapter,
  modelClasses: [InventoryItem],
});
