import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

const MS_PER_DAY = 86_400_000;

type ConversionPromptStore = {
  /** Timestamp (unix ms) of the last time the conversion modal was shown. */
  lastShownAt: number | null;
  /** Number of times the user has dismissed the prompt. */
  dismissCount: number;
  /** Whether the prompt should be shown this session. */
  shouldShow: (trialExpiredOrExpiring: boolean) => boolean;
  /** Record that the prompt was shown / dismissed. */
  recordShown: () => void;
};

export const useConversionPromptStore = create<ConversionPromptStore>()(
  persist(
    (set, get) => ({
      lastShownAt: null,
      dismissCount: 0,

      shouldShow: (trialExpiredOrExpiring: boolean) => {
        if (!trialExpiredOrExpiring)
          return false;

        const { lastShownAt, dismissCount } = get();

        // Don't nag more than 3 times total
        if (dismissCount >= 3)
          return false;

        // Show at most once per day
        if (lastShownAt && Date.now() - lastShownAt < MS_PER_DAY)
          return false;

        return true;
      },

      recordShown: () =>
        set(state => ({
          lastShownAt: Date.now(),
          dismissCount: state.dismissCount + 1,
        })),
    }),
    {
      name: 'conversion-prompt-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);



