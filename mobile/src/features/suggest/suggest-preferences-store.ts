import type { AdventurousnessLevel, MoodFilter } from '../../../../shared/types/meal-suggestion.types';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

type SuggestPreferencesStore = {
  adventurousness: AdventurousnessLevel;
  servings: number;
  moods: MoodFilter[];
  setAdventurousness: (level: AdventurousnessLevel) => void;
  setServings: (servings: number) => void;
  toggleMood: (mood: MoodFilter) => void;
  clearMoods: () => void;
};

export const useSuggestPreferences = create<SuggestPreferencesStore>()(
  persist(
    set => ({
      adventurousness: 3 as AdventurousnessLevel,
      servings: 2,
      moods: [],
      setAdventurousness: (adventurousness: AdventurousnessLevel) => set({ adventurousness }),
      setServings: (servings: number) => set({ servings }),
      toggleMood: (mood: MoodFilter) =>
        set((state) => {
          const exists = state.moods.includes(mood);
          return { moods: exists ? state.moods.filter(m => m !== mood) : [...state.moods, mood] };
        }),
      clearMoods: () => set({ moods: [] }),
    }),
    {
      name: 'suggest-preferences',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);



