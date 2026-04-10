import type { MealSuggestion, SuggestMealsRequest } from '../../../../shared/types/meal-suggestion.types';

import { useRef } from 'react';

import { useInventoryItems } from '@/features/inventory/use-inventory-items';
import { useSavedMealsStore } from '@/features/suggest/saved-meals-store';
import { useSuggestPreferences } from '@/features/suggest/suggest-preferences-store';
import { useSuggestMeals } from '@/features/suggest/use-suggest-meals';

/**
 * Encapsulates all suggestion generation logic — request building,
 * preference signals, and rejection tracking — so the screen component
 * stays under the max-lines lint limit.
 */
export function useSuggestActions() {
  const adventurousness = useSuggestPreferences(s => s.adventurousness);
  const servings = useSuggestPreferences(s => s.servings);
  const moods = useSuggestPreferences(s => s.moods);
  const cookedTitles = useSavedMealsStore(s => s.cookedTitles);
  const savedTitles = useSavedMealsStore(s => s.savedTitles);
  const rejectedTitlesStore = useSavedMealsStore(s => s.rejectedTitles);
  const recordRejected = useSavedMealsStore(s => s.recordRejected);
  const items = useInventoryItems();
  const mutation = useSuggestMeals();
  const rejectedRef = useRef<string[]>([]);

  const likedMeals = [...new Set([...cookedTitles, ...savedTitles])];

  function buildRequest(extraHint?: string): SuggestMealsRequest {
    return {
      inventoryItemIds: items.map(i => i.id),
      adventurousness,
      servings,
      moods: moods.length > 0 ? moods : undefined,
      hint: extraHint,
      likedMeals: likedMeals.length > 0 ? likedMeals : undefined,
      dislikedMeals: rejectedTitlesStore.length > 0 ? rejectedTitlesStore : undefined,
    };
  }

  function generate() {
    rejectedRef.current = [];
    mutation.reset();
    mutation.mutate(buildRequest());
  }

  function surpriseMe(currentSuggestions: MealSuggestion[]) {
    const titles = currentSuggestions.map(s => s.title);
    rejectedRef.current = [...rejectedRef.current, ...titles];
    recordRejected(titles);
    const avoid = rejectedRef.current.join(', ');
    mutation.reset();
    mutation.mutate(buildRequest(`Please suggest completely different meals. Avoid these: ${avoid}`));
  }

  function rejectCurrent(currentSuggestions: MealSuggestion[]) {
    recordRejected(currentSuggestions.map(s => s.title));
  }

  return {
    ...mutation,
    hasItems: items.length > 0,
    generate,
    surpriseMe,
    rejectCurrent,
  };
}
