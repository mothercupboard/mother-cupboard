// Meal suggestion types — populated in Story 4.x
export type AdventurousnessLevel = 1 | 2 | 3 | 4 | 5;

export type MoodFilter =
  | 'quick'
  | 'comfort'
  | 'healthy'
  | 'leftover-rescue'
  | 'batch-cook'
  | 'budget'
  | 'one-pot'
  | 'kid-friendly'
  | 'favourite';

export interface MealSuggestion {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  missingIngredients: string[];
  adventurousness: AdventurousnessLevel;
  estimatedCookTime: number; // minutes
  usesExpiringItems: boolean;
  steps: string[];
}

export interface SuggestMealsRequest {
  inventoryItemIds: string[];
  adventurousness: AdventurousnessLevel;
  servings: number;
  moods?: MoodFilter[];
  /** Free-text hint appended to the prompt — used for "avoid these" or custom requests. */
  hint?: string;
  /** Titles the user previously cooked or saved — positive signal for learning. */
  likedMeals?: string[];
  /** Titles the user rejected — negative signal for learning. */
  dislikedMeals?: string[];
}
