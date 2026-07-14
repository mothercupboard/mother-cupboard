import type { Session, User } from '@supabase/supabase-js';

import type { ApiResponse } from 'shared/types/api.types';

import * as Linking from 'expo-linking';

import { useAuthStore } from '@/features/auth/auth-store';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { database } from '@/lib/database';
import { syncDatabase } from '@/lib/database/sync';
import { logOutRevenueCat } from '@/lib/revenuecat/client';
import { supabase } from '@/lib/supabase/client';

export async function signUp(
  email: string,
  password: string,
): Promise<ApiResponse<{ session: Session | null; user: User }>> {
  const { ageGateAccepted, privacyDisclosureAccepted } = useOnboardingStore.getState();
  const now = new Date().toISOString();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        age_gate_accepted: ageGateAccepted,
        age_gate_accepted_at: now,
        privacy_disclosure_accepted: privacyDisclosureAccepted,
        privacy_disclosure_accepted_at: now,
        trial_started_at: now,
        plan: 'trial',
      },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    const isDuplicate = msg.includes('already registered') || msg.includes('already been registered');
    return {
      data: null,
      error: {
        code: isDuplicate ? 'EMAIL_IN_USE' : 'SIGN_UP_FAILED',
        message: isDuplicate
          ? 'An account with that email already exists'
          : 'Something went wrong. Please try again.',
        retryable: !isDuplicate,
      },
    };
  }

  if (!data.user) {
    return {
      data: null,
      error: {
        code: 'SIGN_UP_FAILED',
        message: 'Something went wrong. Please try again.',
        retryable: true,
      },
    };
  }

  // Return the session from THIS signup — not the ambient supabase session,
  // which could be a stale previous account when confirmation is pending.
  return { data: { user: data.user, session: data.session }, error: null };
}

export async function signIn(email: string, password: string): Promise<ApiResponse<User>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      data: null,
      error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password', retryable: true },
    };
  }
  return { data: data.user, error: null };
}

export async function signOut(): Promise<void> {
  // Push any unsynced local changes BEFORE the session goes away and the
  // local database is wiped below — otherwise edits made since the last
  // sync are lost forever. Best-effort: an offline sign-out still works.
  try {
    await syncDatabase(database);
  }
  catch (err) {
    console.error('[signOut] final sync failed — signing out anyway:', err);
  }
  await logOutRevenueCat().catch(() => {});
  // scope: 'local' clears the session on this device without needing the server
  // to respond — so sign-out still works if the network (or Supabase) is down.
  // Wrapped so a failure here never blocks the local clear below.
  try {
    await supabase.auth.signOut({ scope: 'local' });
  }
  catch (err) {
    console.error('[signOut] supabase signOut failed — clearing locally anyway:', err);
  }
  useAuthStore.getState().clearSession();
  // Wipe on-device data so the next account to sign in on this phone starts
  // clean, rather than seeing the previous account's cupboard. Their data is
  // safe in the cloud and re-syncs on next sign-in.
  try {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  }
  catch (err) {
    console.error('[signOut] failed to reset local database:', err);
  }
}

export async function requestPasswordReset(email: string): Promise<ApiResponse<null>> {
  const redirectTo = Linking.createURL('(auth)/reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    return {
      data: null,
      error: { code: 'RESET_FAILED', message: 'Failed to send reset email. Please try again.', retryable: true },
    };
  }
  return { data: null, error: null };
}

export async function updatePassword(password: string): Promise<ApiResponse<null>> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Surface specific, user-fixable causes rather than a generic failure.
    if (error.code === 'same_password') {
      return {
        data: null,
        error: { code: 'SAME_PASSWORD', message: 'Your new password must be different from your current one.', retryable: true },
      };
    }
    if (error.code === 'weak_password') {
      return {
        data: null,
        error: { code: 'WEAK_PASSWORD', message: 'That password is too weak. Please choose a stronger one.', retryable: true },
      };
    }
    return {
      data: null,
      error: { code: 'UPDATE_FAILED', message: 'Failed to update password. Please try again.', retryable: true },
    };
  }
  return { data: null, error: null };
}

// restorePurchases is now handled directly via RevenueCat store
// (useRevenueCatStore.restore) — no Supabase stub needed.

export async function deleteAccount(): Promise<ApiResponse<null>> {
  const { error } = await supabase.rpc('delete_account');
  if (error) {
    return {
      data: null,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete your account. Please try again.',
        retryable: true,
      },
    };
  }
  return { data: null, error: null };
}
