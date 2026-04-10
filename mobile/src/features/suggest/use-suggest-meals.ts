import type { AxiosError } from 'axios';
import type { ApiResponse } from '../../../../shared/types/api.types';
import type { MealSuggestion, SuggestMealsRequest } from '../../../../shared/types/meal-suggestion.types';

import { useMutation } from '@tanstack/react-query';

import { client } from '@/lib/api/client';

async function fetchSuggestions(req: SuggestMealsRequest): Promise<MealSuggestion[]> {
  const { data } = await client.post<ApiResponse<MealSuggestion[]>>(
    '/suggest-meals',
    req,
  );

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.data;
}

/**
 * React Query mutation that calls the suggest-meals endpoint.
 * Returns loading / error / data states for the UI.
 */
export function useSuggestMeals() {
  return useMutation<MealSuggestion[], AxiosError | Error, SuggestMealsRequest>({
    mutationFn: fetchSuggestions,
  });
}
