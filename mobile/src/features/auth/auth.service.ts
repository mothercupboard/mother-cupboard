import type { User } from '@supabase/supabase-js';

import type { ApiResponse } from 'shared/types/api.types';

import * as Linking from 'expo-linking';

import { useAuthStore } from '@/features/auth/auth-store';
import { useOnboardingStore } from '@/features/onboarding/onboarding-store';
import { supabase } from '@/lib/supabase/client';

export async function signUp(
  email: string,
  password: string,
): Promise<ApiResponse<User>> {
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

  return { data: data.user, error: null };
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
  await supabase.auth.signOut();
  useAuthStore.getState().clearSession();
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
    return {
      data: null,
      error: { code: 'UPDATE_FAILED', message: 'Failed to update password. Please try again.', retryable: true },
    };
  }
  return { data: null, error: null };
}

/**
 * Restore purchases — updates user metadata to premium if a valid
 * subscription is found. Currently a stub that checks Supabase metadata;
 * will be wired to App Store / Play Store receipt validation in a future story.
 */
export async function restorePurchases(): Promise<ApiResponse<null>> {
  const { data: { user }, error: fetchError } = await supabase.auth.getUser();
  if (fetchError || !user) {
    return {
      data: null,
      error: { code: 'RESTORE_FAILED', message: 'Could not verify your account. Please try again.', retryable: true },
    };
  }

  const plan = user.user_metadata?.plan;
  if (plan === 'premium') {
    // Already premium — refresh the local session to pick up metadata
    await supabase.auth.refreshSession();
    return { data: null, error: null };
  }

  // Stub: in future, validate App Store / Play Store receipt here.
  // For now, return a clear message that no purchase was found.
  return {
    data: null,
    error: { code: 'NO_PURCHASE', message: 'No active subscription found. If you recently purchased, please try again in a few minutes.', retryable: true },
  };
}

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
