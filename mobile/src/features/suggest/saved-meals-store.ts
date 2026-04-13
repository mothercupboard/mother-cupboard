import type { MealSuggestion } from '../../../../shared/types/meal-suggestion.types';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';

const mmkvZustandStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

/** Capped length for preference signal arrays — keeps storage bounded. */
const MAX_SIGNAL_LENGTH = 50;
const MAX_HISTORY_LENGTH = 100;

function capArray(arr: string[]): string[] {
  return arr.length > MAX_SIGNAL_LENGTH ? arr.slice(-MAX_SIGNAL_LENGTH) : arr;
}

export type CookedMealEntry = MealSuggestion & {
  cookedAt: number; // unix ms
};

type SavedMealsStore = {
  /** Full meal objects the user bookmarked (save for later). */
  savedMeals: MealSuggestion[];
  /** Full meal objects the user marked as favourites. */
  favouriteMeals: MealSuggestion[];
  /** Chronological history of cooked meals with timestamps. */
  cookedMeals: CookedMealEntry[];
  /** Titles the user cooked — strong positive signal. */
  cookedTitles: string[];
  /** Titles the user bookmarked — positive signal. */
  savedTitles: string[];
  /** Titles from "None of these" / rejected batches — negative signal. */
  rejectedTitles: string[];

  saveMeal: (meal: MealSuggestion) => void;
  unsaveMeal: (id: string) => void;
  isSaved: (id: string) => boolean;
  favouriteMeal: (meal: MealSuggestion) => void;
  unfavouriteMeal: (id: string) => void;
  isFavourite: (id: string) => boolean;
  recordCooked: (meal: MealSuggestion) => void;
  recordRejected: (titles: string[]) => void;
};

export const useSavedMealsStore = create<SavedMealsStore>()(
  persist(
    (set, get) => ({
      savedMeals: [],
      favouriteMeals: [],
      cookedMeals: [],
      cookedTitles: [],
      savedTitles: [],
      rejectedTitles: [],

      saveMeal: (meal: MealSuggestion) =>
        set((state) => {
          if (state.savedMeals.some(m => m.id === meal.id))
            return state;
          return {
            savedMeals: [...state.savedMeals, meal],
            savedTitles: capArray([...state.savedTitles, meal.title]),
          };
        }),

      unsaveMeal: (id: string) =>
        set(state => ({
          savedMeals: state.savedMeals.filter(m => m.id !== id),
        })),

      isSaved: (id: string) => get().savedMeals.some(m => m.id === id),

      favouriteMeal: (meal: MealSuggestion) =>
        set((state) => {
          if (state.favouriteMeals.some(m => m.id === meal.id))
            return state;
          return { favouriteMeals: [...state.favouriteMeals, meal] };
        }),

      unfavouriteMeal: (id: string) =>
        set(state => ({
          favouriteMeals: state.favouriteMeals.filter(m => m.id !== id),
        })),

      isFavourite: (id: string) => get().favouriteMeals.some(m => m.id === id),

      recordCooked: (meal: MealSuggestion) =>
        set((state) => {
          const entry: CookedMealEntry = { ...meal, cookedAt: Date.now() };
          const history = [...state.cookedMeals, entry];
          return {
            cookedMeals: history.length > MAX_HISTORY_LENGTH
              ? history.slice(-MAX_HISTORY_LENGTH)
              : history,
            cookedTitles: capArray([...state.cookedTitles, meal.title]),
          };
        }),

      recordRejected: (titles: string[]) =>
        set(state => ({
          rejectedTitles: capArray([...state.rejectedTitles, ...titles]),
        })),
    }),
    {
      name: 'saved-meals-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);

