import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

export const GUEST_TRIAL_DAYS = 7;
const MS_PER_DAY = 86_400_000;

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

type GuestStore = {
  isGuest: boolean;
  guestStartedAt: string | null;
  startGuestSession: () => void;
  endGuestSession: () => void;
};

export const useGuestStore = create<GuestStore>()(
  persist(
    set => ({
      isGuest: false,
      guestStartedAt: null,
      startGuestSession: () => set({ isGuest: true, guestStartedAt: new Date().toISOString() }),
      endGuestSession: () => set({ isGuest: false, guestStartedAt: null }),
    }),
    {
      name: 'guest-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);

/** Returns true if the guest trial has expired (> 7 days since start). */
export function isGuestExpired(guestStartedAt: string | null): boolean {
  if (!guestStartedAt)
    return false;
  return Date.now() - new Date(guestStartedAt).getTime() >= GUEST_TRIAL_DAYS * MS_PER_DAY;
}

/** Returns whole days remaining in the guest trial (0 if expired). */
export function guestDaysRemaining(guestStartedAt: string | null): number {
  if (!guestStartedAt)
    return 0;
  const elapsed = Date.now() - new Date(guestStartedAt).getTime();
  return Math.max(0, GUEST_TRIAL_DAYS - Math.floor(elapsed / MS_PER_DAY));
}
