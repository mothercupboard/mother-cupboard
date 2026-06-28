import type { MealSuggestion } from '../../../../shared/types/meal-suggestion.types';
import type { LocalSuggestRequest } from '@/lib/ai/suggest-meals';

import { useRef } from 'react';

import { useInventoryItems } from '@/features/inventory/use-inventory-items';
import { isLikelyMeat } from '@/features/suggest/is-meat';
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
  const featuredItem = useSuggestPreferences(s => s.featuredItem);
  const vegetarian = useSuggestPreferences(s => s.vegetarian);
  const cookedTitles = useSavedMealsStore(s => s.cookedTitles);
  const savedTitles = useSavedMealsStore(s => s.savedTitles);
  const rejectedTitlesStore = useSavedMealsStore(s => s.rejectedTitles);
  const recordRejected = useSavedMealsStore(s => s.recordRejected);
  const items = useInventoryItems();
  const mutation = useSuggestMeals();
  const rejectedRef = useRef<string[]>([]);

  const likedMeals = [...new Set([...cookedTitles, ...savedTitles])];

  function buildRequest(extraHint?: string): LocalSuggestRequest {
    const hintParts: string[] = [];
    // If the featured item is meat/fish but vegetarian is on, vegetarian wins —
    // don't send a contradictory "use the meat" instruction to the AI.
    const featureConflictsWithVeg = vegetarian && isLikelyMeat(featuredItem);
    if (featuredItem && !featureConflictsWithVeg)
      hintParts.push(`The user especially wants to use up their ${featuredItem} — make sure at least one suggestion features it prominently.`);
    if (vegetarian)
      hintParts.push('Only suggest vegetarian meals — no meat, poultry or fish (eggs and dairy are fine).');
    if (extraHint)
      hintParts.push(extraHint);
    const hint = hintParts.length > 0 ? hintParts.join(' ') : undefined;

    return {
      items: items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        location: i.location,
        expiryDate: i.expiryDate,
        expiryType: i.expiryType,
      })),
      adventurousness,
      servings,
      moods: moods.length > 0 ? moods : undefined,
      hint,
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
