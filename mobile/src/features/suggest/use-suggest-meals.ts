import { useMutation } from '@tanstack/react-query';
import type { MealSuggestion } from '../../../../shared/types/meal-suggestion.types';
import type { LocalSuggestRequest } from '@/lib/ai/suggest-meals';
import { suggestMealsLocal } from '@/lib/ai/suggest-meals';

export function useSuggestMeals() {
  return useMutation<MealSuggestion[], Error, LocalSuggestRequest>({
    mutationFn: suggestMealsLocal,
  });
}
