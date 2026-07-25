import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

type SaverStore = {
  /**
   * Retailer ids the user shops at (e.g. ['aldi']). Empty = Saver Cupboard
   * offers are off and Suggest behaves exactly as before.
   */
  retailerIds: string[];
  toggleRetailer: (id: string) => void;
};

/**
 * Saver Cupboard preferences — which supermarket(s) the user shops at.
 * Their weekly offers are woven into Suggest and shown on the Suggest screen.
 */
export const useSaverStore = create<SaverStore>()(
  persist(
    set => ({
      retailerIds: [],
      toggleRetailer: id =>
        set(state => ({
          retailerIds: state.retailerIds.includes(id)
            ? state.retailerIds.filter(r => r !== id)
            : [...state.retailerIds, id],
        })),
    }),
    {
      name: 'saver-cupboard',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);
