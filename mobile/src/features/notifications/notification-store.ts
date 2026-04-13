import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

export type NotificationPreferences = {
  useByAlerts: boolean;
  bestBeforeAlerts: boolean;
  /** Hour of the day (0â€“23) for scheduled morning alerts. Default 8. */
  alertHour: number;
};

type NotificationStore = {
  hasPrompted: boolean;
  setHasPrompted: () => void;
} & NotificationPreferences & {
  setUseByAlerts: (enabled: boolean) => void;
  setBestBeforeAlerts: (enabled: boolean) => void;
  setAlertHour: (hour: number) => void;
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    set => ({
      hasPrompted: false,
      setHasPrompted: () => set({ hasPrompted: true }),

      useByAlerts: true,
      bestBeforeAlerts: true,
      alertHour: 8,
      setUseByAlerts: (useByAlerts: boolean) => set({ useByAlerts }),
      setBestBeforeAlerts: (bestBeforeAlerts: boolean) => set({ bestBeforeAlerts }),
      setAlertHour: (alertHour: number) => set({ alertHour }),
    }),
    {
      name: 'notification-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);




