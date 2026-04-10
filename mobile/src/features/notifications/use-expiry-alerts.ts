import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useEntitlements } from '@/features/auth/entitlements';
import { useNotificationStore } from '@/features/notifications/notification-store';
import { useDatabase } from '@/lib/database/provider';

import { scheduleExpiryAlerts } from './schedule-expiry-alerts';

/**
 * Reschedules expiry notifications whenever the app comes to the foreground
 * or when notification preferences change. Call once from the authenticated
 * shell (e.g. tabs layout).
 *
 * On the free tier, scheduled alerts are not available — the hook is a
 * no-op so existing scheduled notifications are not re-created.
 */
export function useExpiryAlerts() {
  const db = useDatabase();
  const { canUseScheduledAlerts } = useEntitlements();
  const useByAlerts = useNotificationStore(s => s.useByAlerts);
  const bestBeforeAlerts = useNotificationStore(s => s.bestBeforeAlerts);
  const alertHour = useNotificationStore(s => s.alertHour);
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!canUseScheduledAlerts)
      return;

    const prefs = { useByAlerts, bestBeforeAlerts, alertHour };

    // Debounce: don't re-run if we already ran within the last 30 s
    function run() {
      const now = Date.now();
      if (now - lastRunRef.current < 30_000)
        return;
      lastRunRef.current = now;
      scheduleExpiryAlerts(db, prefs);
    }

    // Run once on mount / when preferences change
    run();

    // Re-run each time the app returns to the foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active')
        run();
    });

    return () => sub.remove();
  }, [db, canUseScheduledAlerts, useByAlerts, bestBeforeAlerts, alertHour]);
}
