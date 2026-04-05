import type { Database } from '@nozbe/watermelondb';
import type { SyncPullResult, SyncTableChangeSet } from '@nozbe/watermelondb/sync';

import { synchronize } from '@nozbe/watermelondb/sync';

import { supabase } from '@/lib/supabase/client';

type SupabaseInventoryRow = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  location: string;
  expiry_date: number | null;
  expiry_type: string | null;
  barcode: string | null;
  category: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: number;
  updated_at: number;
};

function toWatermelonRecord(row: SupabaseInventoryRow) {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    location: row.location,
    expiry_date: row.expiry_date,
    expiry_type: row.expiry_type,
    barcode: row.barcode,
    category: row.category,
    notes: row.notes,
    is_deleted: row.is_deleted,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function pushCreated(
  records: SyncTableChangeSet['created'],
  userId: string,
  now: number,
) {
  if (records.length === 0)
    return;
  const rows = records.map(r => ({
    id: r.id,
    name: r.name as string,
    quantity: (r.quantity as number | null) ?? null,
    unit: (r.unit as string | null) ?? null,
    location: r.location as string,
    expiry_date: (r.expiry_date as number | null) ?? null,
    expiry_type: (r.expiry_type as string | null) ?? null,
    barcode: (r.barcode as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    is_deleted: (r.is_deleted as boolean) ?? false,
    user_id: userId,
    created_at: now,
    updated_at: now,
  }));
  const { error } = await supabase.from('inventory_items').insert(rows);
  if (error)
    throw new Error(error.message);
}

async function pushUpdated(
  records: SyncTableChangeSet['updated'],
  userId: string,
  now: number,
) {
  for (const r of records) {
    const { error } = await supabase
      .from('inventory_items')
      .update({
        name: r.name as string,
        quantity: (r.quantity as number | null) ?? null,
        unit: (r.unit as string | null) ?? null,
        location: r.location as string,
        expiry_date: (r.expiry_date as number | null) ?? null,
        expiry_type: (r.expiry_type as string | null) ?? null,
        barcode: (r.barcode as string | null) ?? null,
        category: (r.category as string | null) ?? null,
        notes: (r.notes as string | null) ?? null,
        is_deleted: (r.is_deleted as boolean) ?? false,
        updated_at: now,
      })
      .eq('id', r.id)
      .eq('user_id', userId);
    if (error)
      throw new Error(error.message);
  }
}

async function pushDeleted(ids: SyncTableChangeSet['deleted'], userId: string, now: number) {
  if (ids.length === 0)
    return;
  const { error } = await supabase
    .from('inventory_items')
    .update({ is_deleted: true, updated_at: now })
    .in('id', ids)
    .eq('user_id', userId);
  if (error)
    throw new Error(error.message);
}

export async function syncDatabase(db: Database): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return;

  await synchronize({
    database: db,

    pullChanges: async ({ lastPulledAt }): Promise<SyncPullResult> => {
      const since = lastPulledAt ?? 0;

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .gt('updated_at', since);

      if (error)
        throw new Error(error.message);

      const rows = (data ?? []) as SupabaseInventoryRow[];

      // Server-wins: separate rows by create/update/delete based on timestamps
      const created = rows
        .filter(r => r.created_at > since && !r.is_deleted)
        .map(toWatermelonRecord);

      const updated = rows
        .filter(r => r.created_at <= since && !r.is_deleted)
        .map(toWatermelonRecord);

      const deleted = rows.filter(r => r.is_deleted).map(r => r.id);

      return {
        changes: { inventory_items: { created, updated, deleted } },
        timestamp: Date.now(),
      };
    },

    pushChanges: async ({ changes }) => {
      // TableName<any> is a branded string — cast to plain Record to access by name
      const tableChanges = changes as unknown as Record<string, SyncTableChangeSet | undefined>;
      const items = tableChanges.inventory_items;
      if (!items)
        return;

      const now = Date.now();
      await pushCreated(items.created, user.id, now);
      await pushUpdated(items.updated, user.id, now);
      await pushDeleted(items.deleted, user.id, now);
    },
  });
}
