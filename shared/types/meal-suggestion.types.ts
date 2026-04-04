// Meal suggestion types — populated in Story 4.x
export type AdventurousnessLevel = 1 | 2 | 3 | 4 | 5;

export interface MealSuggestion {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  missingIngredients: string[];
  adventurousness: AdventurousnessLevel;
  estimatedCookTime: number; // minutes
  usesExpiringItems: boolean;
}

export interface SuggestMealsRequest {
  inventoryItemIds: string[];
  adventurousness: AdventurousnessLevel;
  servings: number;
}
