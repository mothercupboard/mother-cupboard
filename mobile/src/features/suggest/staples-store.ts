import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

/**
 * Built-in staple keywords seeded on first launch. Users can remove any of
 * these from their enabled list, or add custom entries (e.g. "butter").
 *
 * Matching is substring-based and case-insensitive (see `isStaple`), so short
 * tokens like ' oil' use a leading space to avoid false positives on words
 * like "boiler" or "spoil".
 */
export const DEFAULT_STAPLES: readonly string[] = [
  'salt',
  'pepper',
  ' oil',
  'water',
  'mixed herbs',
  'dried herbs',
  'seasoning',
  'stock cube',
  'stock pot',
  'herbs',
  'spice',
  'spices',
  'bay leaf',
  'bay leaves',
];

type StaplesStore = {
  /** Active staple keywords — anything matching one of these is skipped during deduction. */
  enabled: string[];
  /** Add a new keyword. No-op if already present (case-insensitive). */
  addStaple: (keyword: string) => void;
  /** Remove a keyword. No-op if not present. */
  removeStaple: (keyword: string) => void;
  /** Restore the built-in defaults, replacing the current list. */
  resetToDefaults: () => void;
};

export const useStaplesStore = create<StaplesStore>()(
  persist(
    set => ({
      enabled: [...DEFAULT_STAPLES],
      addStaple: (keyword: string) => {
        const trimmed = keyword.trim();
        if (!trimmed)
          return;
        set((state) => {
          const exists = state.enabled.some(
            s => s.trim().toLowerCase() === trimmed.toLowerCase(),
          );
          return exists ? state : { enabled: [...state.enabled, trimmed.toLowerCase()] };
        });
      },
      removeStaple: (keyword: string) => {
        set(state => ({
          enabled: state.enabled.filter(s => s !== keyword),
        }));
      },
      resetToDefaults: () => set({ enabled: [...DEFAULT_STAPLES] }),
    }),
    {
      name: 'staples-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);

/** Returns true if `ingredientName` matches any of the supplied staple keywords. */
export function isStaple(ingredientName: string, staples: string[]): boolean {
  const lower = ingredientName.toLowerCase();
  return staples.some(keyword => lower.includes(keyword.toLowerCase()));
}
