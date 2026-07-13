import { useAuthStore } from '@/features/auth/auth-store';
import { isGuestExpired, useGuestStore } from '@/features/guest/guest-store';
import { useRevenueCatStore } from '@/lib/revenuecat/store';

export type PlanType = 'trial' | 'free' | 'premium';

export type Entitlements = {
  plan: PlanType;
  /** AI-powered meal suggestions */
  canUseSuggestions: boolean;
  /** Scheduled push notifications for expiry alerts */
  canUseScheduledAlerts: boolean;
  /** Cloud sync to Supabase */
  canUseCloudSync: boolean;
  /** Save & favourite meals, cooking history */
  canUseMealHistory: boolean;
  /** Create household invites so others can share the cupboard */
  canUseHouseholdSharing: boolean;
};

const TRIAL_DAYS = 30;
const MS_PER_DAY = 86_400_000;

function deriveTrialOrFree(meta: Record<string, unknown> | undefined): 'trial' | 'free' {
  if (!meta)
    return 'free';

  const plan = meta.plan as string | undefined;

  if (plan === 'trial') {
    const startedAt = meta.trial_started_at as string | undefined;
    if (!startedAt)
      return 'free';
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / MS_PER_DAY);
    return elapsed < TRIAL_DAYS ? 'trial' : 'free';
  }

  return 'free';
}

/**
 * Derives the user's current plan and feature entitlements.
 *
 * - **Premium**: RevenueCat reports an active subscription
 * - **Trial**: Supabase metadata shows a trial within 30 days
 * - **Free**: neither of the above
 *
 * In non-production builds (dev/preview), the trial is always active
 * so all features are unlocked for testing.
 *
 * **Free tier includes:** inventory management, manual shopping list,
 * expiry badge UI (but not scheduled push alerts). Joining a household
 * with an invite code is also free — only *creating* invites is premium.
 */
export function useEntitlements(): Entitlements {
  const user = useAuthStore(s => s.user);
  const hasPremium = useRevenueCatStore(s => s.hasPremium);
  const isGuest = useGuestStore(s => s.isGuest);
  const guestStartedAt = useGuestStore(s => s.guestStartedAt);

  // Active guest trial: full access for 7 days, local storage only
  if (isGuest && !isGuestExpired(guestStartedAt)) {
    return {
      plan: 'trial',
      canUseSuggestions: true,
      canUseScheduledAlerts: true,
      canUseCloudSync: false, // guests are local-only
      canUseMealHistory: true,
      canUseHouseholdSharing: false, // sharing needs an account (cloud sync)
    };
  }

  // Non-production builds: unlock everything for testing
  if (process.env.EXPO_PUBLIC_APP_ENV !== 'production') {
    return {
      plan: 'trial',
      canUseSuggestions: true,
      canUseScheduledAlerts: true,
      canUseCloudSync: true,
      canUseMealHistory: true,
      canUseHouseholdSharing: true,
    };
  }

  // RevenueCat is the source of truth for paid subscriptions
  if (hasPremium) {
    return {
      plan: 'premium',
      canUseSuggestions: true,
      canUseScheduledAlerts: true,
      canUseCloudSync: true,
      canUseMealHistory: true,
      canUseHouseholdSharing: true,
    };
  }

  // Fall back to trial check from Supabase metadata
  const plan = deriveTrialOrFree(user?.user_metadata);
  const isPaid = plan === 'trial';

  return {
    plan,
    canUseSuggestions: isPaid,
    canUseScheduledAlerts: isPaid,
    canUseCloudSync: isPaid,
    canUseMealHistory: isPaid,
    canUseHouseholdSharing: isPaid,
  };
}
