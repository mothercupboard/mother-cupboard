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

// --- Household scoping -------------------------------------------------
// Items are shared across a household, so sync is scoped by household_id
// rather than user_id. The membership rarely changes, so cache it per user
// and clear the cache when the user joins or leaves a household.

let cachedHousehold: { userId: string; householdId: string } | null = null;

export function clearHouseholdCache(): void {
  cachedHousehold = null;
}

async function resolveHouseholdId(userId: string): Promise<string | null> {
  if (cachedHousehold?.userId === userId)
    return cachedHousehold.householdId;

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error || !data)
    return null;

  cachedHousehold = { userId, householdId: data.household_id as string };
  return cachedHousehold.householdId;
}

// -----------------------------------------------------------------------

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

type PushContext = {
  userId: string;
  householdId: string;
  now: number;
};

async function pushCreated(
  records: SyncTableChangeSet['created'],
  ctx: PushContext,
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
    user_id: ctx.userId, // who added it
    household_id: ctx.householdId,
    created_at: ctx.now,
    updated_at: ctx.now,
  }));
  const { error } = await supabase.from('inventory_items').insert(rows);
  if (error)
    throw new Error(error.message);
}

async function pushUpdated(
  records: SyncTableChangeSet['updated'],
  householdId: string,
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
      .eq('household_id', householdId);
    if (error)
      throw new Error(error.message);
  }
}

async function pushDeleted(ids: SyncTableChangeSet['deleted'], householdId: string, now: number) {
  if (ids.length === 0)
    return;
  const { error } = await supabase
    .from('inventory_items')
    .update({ is_deleted: true, updated_at: now })
    .in('id', ids)
    .eq('household_id', householdId);
  if (error)
    throw new Error(error.message);
}

export async function syncDatabase(db: Database): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return;

  const householdId = await resolveHouseholdId(user.id);
  if (!householdId)
    return; // no household yet (should not happen after backfill) — skip rather than fail

  await synchronize({
    database: db,

    pullChanges: async ({ lastPulledAt }): Promise<SyncPullResult> => {
      const since = lastPulledAt ?? 0;

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('household_id', householdId)
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
      await pushCreated(items.created, { userId: user.id, householdId, now });
      await pushUpdated(items.updated, householdId, now);
      await pushDeleted(items.deleted, householdId, now);
    },
  });
}
