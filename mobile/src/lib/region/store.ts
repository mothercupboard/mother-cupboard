import type { RegionCode } from './config';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';
import { detectDeviceRegion, REGIONS } from './config';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

type RegionStore = {
  /** The user's selected region code. Seeded from the device on first launch. */
  region: RegionCode;
  setRegion: (region: RegionCode) => void;
};

export const useRegionStore = create<RegionStore>()(
  persist(
    set => ({
      region: detectDeviceRegion(),
      setRegion: region => set({ region }),
    }),
    {
      name: 'region',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);

/**
 * Non-reactive accessor for use outside React (formatters, services).
 * For components, prefer {@link useRegion} so they re-render on change.
 */
export function getActiveRegion() {
  return REGIONS[useRegionStore.getState().region];
}

/** Reactive hook returning the active region's full config. */
export function useRegion() {
  const region = useRegionStore(s => s.region);
  return REGIONS[region];
}
