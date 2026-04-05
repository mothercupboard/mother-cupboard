import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { InventoryItem } from './models/inventory-item';
import { databaseSchema } from './schema';

const adapter = new SQLiteAdapter({
  schema: databaseSchema,
  // migrations: [] — add here in future stories when schema changes
});

export const database = new Database({
  adapter,
  modelClasses: [InventoryItem],
});
