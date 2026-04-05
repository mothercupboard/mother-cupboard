import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Schema version — increment when columns are added or removed (requires a migration)
export const SCHEMA_VERSION = 1;

export const databaseSchema = appSchema({
  version: SCHEMA_VERSION,
  tables: [
    tableSchema({
      name: 'inventory_items',
      columns: [
        // FR1-FR4: core item fields
        { name: 'name', type: 'string' },
        { name: 'quantity', type: 'number', isOptional: true },
        { name: 'unit', type: 'string', isOptional: true },
        // FR7: location tab (fridge | freezer | cupboard)
        { name: 'location', type: 'string' },
        // FR8/FR9: expiry — stored as unix ms; type distinguishes use-by vs best-before
        { name: 'expiry_date', type: 'number', isOptional: true },
        { name: 'expiry_type', type: 'string', isOptional: true }, // 'use_by' | 'best_before'
        // FR1: barcode resolved during scan
        { name: 'barcode', type: 'string', isOptional: true },
        // FR2/FR3: product category from search or manual entry
        { name: 'category', type: 'string', isOptional: true },
        // FR3: free-text notes (decanted items, tupperware contents)
        { name: 'notes', type: 'string', isOptional: true },
        // Soft-delete — kept in DB so WatermelonDB sync can propagate deletions
        { name: 'is_deleted', type: 'boolean' },
        // Timestamps in unix ms — match Supabase bigint columns for sync
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
