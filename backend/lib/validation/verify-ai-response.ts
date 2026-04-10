import type { MealSuggestion } from '@shared/types/meal-suggestion.types';

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_INGREDIENT_LENGTH = 100;
const MAX_INGREDIENTS = 30;
const MAX_SUGGESTIONS = 10;

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sanitiseStringList(arr: unknown, maxLen: number, maxItems: number): string[] {
  if (!Array.isArray(arr))
    return [];
  return arr
    .filter(isString)
    .map(s => s.trim().slice(0, maxLen))
    .filter(s => s.length > 0)
    .slice(0, maxItems);
}

/**
 * Validates a single suggestion object from the AI response.
 * Returns a cleaned {@link MealSuggestion} or `null` if the object
 * is too malformed to salvage.
 */
function verifySuggestion(raw: unknown, index: number): MealSuggestion | null {
  if (typeof raw !== 'object' || raw === null)
    return null;

  const obj = raw as Record<string, unknown>;

  // Required string fields
  const title = isString(obj.title) ? obj.title.trim().slice(0, MAX_TITLE_LENGTH) : null;
  if (!title)
    return null;

  const description = isString(obj.description) ? obj.description.trim().slice(0, MAX_DESCRIPTION_LENGTH) : '';

  // ID — use provided or generate a fallback
  const id = isString(obj.id) && obj.id.trim()
    ? obj.id.trim().slice(0, 50)
    : `suggestion-${index}`;

  // Numeric fields with clamping
  const adventurousness = isNumber(obj.adventurousness)
    ? clamp(obj.adventurousness, 1, 5) as 1 | 2 | 3 | 4 | 5
    : 3;

  const estimatedCookTime = isNumber(obj.estimatedCookTime)
    ? clamp(obj.estimatedCookTime, 1, 480)
    : 30;

  // Boolean
  const usesExpiringItems = isBoolean(obj.usesExpiringItems)
    ? obj.usesExpiringItems
    : false;

  // Arrays
  const ingredients = sanitiseStringList(obj.ingredients, MAX_INGREDIENT_LENGTH, MAX_INGREDIENTS);
  const missingIngredients = sanitiseStringList(obj.missingIngredients, MAX_INGREDIENT_LENGTH, MAX_INGREDIENTS);

  // Must have at least a title to be useful
  return {
    id,
    title,
    description,
    ingredients,
    missingIngredients,
    adventurousness,
    estimatedCookTime,
    usesExpiringItems,
  };
}

export type VerifyResult = {
  /** Suggestions that passed verification (may be fewer than the AI returned). */
  suggestions: MealSuggestion[];
  /** Number of suggestions the AI returned that failed verification. */
  droppedCount: number;
};

/**
 * Parses and verifies the raw AI response string. Each suggestion is
 * individually validated — malformed ones are dropped rather than
 * failing the entire request. Fields are sanitised (length caps, type
 * coercion, range clamping) so the client can trust the shape.
 */
export function verifyAIResponse(raw: string): VerifyResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  }
  catch {
    throw new Error('AI response is not valid JSON');
  }

  let rawSuggestions: unknown[];
  if (Array.isArray(parsed)) {
    rawSuggestions = parsed;
  }
  else if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as Record<string, unknown>).suggestions)) {
    rawSuggestions = (parsed as Record<string, unknown>).suggestions as unknown[];
  }
  else {
    throw new Error('AI response does not contain a suggestions array');
  }

  const capped = rawSuggestions.slice(0, MAX_SUGGESTIONS);
  const verified: MealSuggestion[] = [];
  let droppedCount = 0;

  for (let i = 0; i < capped.length; i++) {
    const result = verifySuggestion(capped[i], i);
    if (result)
      verified.push(result);
    else
      droppedCount++;
  }

  return { suggestions: verified, droppedCount };
}
