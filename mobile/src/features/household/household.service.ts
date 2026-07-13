import { supabase } from '@/lib/supabase/client';

export type HouseholdMember = {
  user_id: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
};

export type HouseholdInfo = {
  id: string;
  name: string;
  members: HouseholdMember[];
};

type ServiceResult<T> = { data: T | null; error: string | null };

// Postgres errors arrive as "P0001: actual message" — strip the code prefix
const PG_ERROR_PREFIX = /^.*:\s*/;

function messageOf(error: { message?: string } | null, fallback: string): string {
  return error?.message?.replace(PG_ERROR_PREFIX, '') ?? fallback;
}

/** Fetch the caller's household with its member list (emails included). */
export async function fetchHouseholdInfo(): Promise<ServiceResult<HouseholdInfo>> {
  const { data, error } = await supabase.rpc('get_household_info');
  if (error)
    return { data: null, error: messageOf(error, 'Could not load your household.') };
  return { data: (data as HouseholdInfo | null), error: null };
}

/** Generate a 48-hour, single-use invite code for the caller's household. */
export async function createHouseholdInvite(): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.rpc('create_household_invite');
  if (error)
    return { data: null, error: messageOf(error, 'Could not create an invite code.') };
  return { data: data as string, error: null };
}

/**
 * Join a household by invite code. The caller's existing items are merged
 * into the shared cupboard server-side. After this succeeds, the local
 * database must be wiped and fully re-synced (see household-section.tsx).
 */
export async function joinHousehold(code: string): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.rpc('join_household', { invite_code: code });
  if (error)
    return { data: null, error: messageOf(error, 'Could not join that household.') };
  return { data: data as string, error: null };
}

/**
 * Leave the current household. Shared items stay with the household;
 * the caller gets a fresh, empty household. After this succeeds, the
 * local database must be wiped and fully re-synced.
 */
export async function leaveHousehold(): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.rpc('leave_household');
  if (error)
    return { data: null, error: messageOf(error, 'Could not leave the household.') };
  return { data: data as string, error: null };
}
