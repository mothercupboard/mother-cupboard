import { useAuthStore } from '@/features/auth/auth-store';

const TRIAL_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export type TrialStatus
  = | { state: 'active'; daysRemaining: number }
    | { state: 'expiring'; daysRemaining: number }
    | { state: 'expired' }
    | { state: 'none' };

/**
 * Derives the trial status from the authenticated user's metadata.
 * Returns a discriminated union so the UI can render accordingly.
 *
 * - `active`: > 7 days remaining
 * - `expiring`: 1–7 days remaining (show warning)
 * - `expired`: 0 days remaining
 * - `none`: no trial metadata (pre-existing user or already converted)
 */
export function useTrialStatus(): TrialStatus {
  const user = useAuthStore(s => s.user);

  if (!user)
    return { state: 'none' };

  const meta = user.user_metadata;
  const plan = meta?.plan as string | undefined;
  const trialStartedAt = meta?.trial_started_at as string | undefined;

  // Already upgraded — no trial banner needed
  if (plan && plan !== 'trial')
    return { state: 'none' };

  if (!trialStartedAt)
    return { state: 'none' };

  const startMs = new Date(trialStartedAt).getTime();
  if (Number.isNaN(startMs))
    return { state: 'none' };

  const elapsedDays = Math.floor((Date.now() - startMs) / MS_PER_DAY);
  const daysRemaining = Math.max(0, TRIAL_DAYS - elapsedDays);

  if (daysRemaining === 0)
    return { state: 'expired' };
  if (daysRemaining <= 7)
    return { state: 'expiring', daysRemaining };
  return { state: 'active', daysRemaining };
}
