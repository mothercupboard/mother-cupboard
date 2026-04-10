import { useAuthStore } from '@/features/auth/auth-store';

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
};

const TRIAL_DAYS = 30;
const MS_PER_DAY = 86_400_000;

function derivePlan(meta: Record<string, unknown> | undefined): PlanType {
  if (!meta)
    return 'free';

  const plan = meta.plan as string | undefined;

  // Explicit premium
  if (plan === 'premium')
    return 'premium';

  // Trial — check if still valid
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
 * Derives the user's current plan and feature entitlements from Supabase
 * user metadata. Trial users get full access; free-tier users get core
 * inventory features only; premium users get everything.
 *
 * **Free tier includes:** inventory management, manual shopping list,
 * expiry badge UI (but not scheduled push alerts).
 */
export function useEntitlements(): Entitlements {
  const user = useAuthStore(s => s.user);
  const plan = derivePlan(user?.user_metadata);

  const isPaid = plan === 'trial' || plan === 'premium';

  return {
    plan,
    canUseSuggestions: isPaid,
    canUseScheduledAlerts: isPaid,
    canUseCloudSync: isPaid,
    canUseMealHistory: isPaid,
  };
}
