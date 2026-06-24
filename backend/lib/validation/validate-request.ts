import type { SuggestMealsRequest } from '@shared/types/meal-suggestion.types';

const VALID_MOODS = new Set([
  'quick', 'comfort', 'healthy', 'leftover-rescue',
  'batch-cook', 'budget', 'one-pot', 'kid-friendly', 'favourite',
]);

const MAX_INVENTORY_IDS = 500;
const MAX_MOOD_COUNT = 8;
const MAX_LIKED_COUNT = 50;
const MAX_DISLIKED_COUNT = 50;
const MAX_HINT_LENGTH = 500;
const MAX_STRING_LENGTH = 200;

type ValidationResult =
  | { ok: true; data: SuggestMealsRequest }
  | { ok: false; message: string };

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function sanitiseStringArray(arr: unknown, max: number): string[] | null {
  if (!Array.isArray(arr))
    return null;
  return arr
    .filter(isString)
    .map(s => s.trim().slice(0, MAX_STRING_LENGTH))
    .filter(s => s.length > 0)
    .slice(0, max);
}

/**
 * Validates and sanitises the incoming request body for the suggest-meals
 * endpoint. Returns a discriminated union — either the cleaned data or
 * a human-readable error message.
 */
export function validateSuggestRequest(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null)
    return { ok: false, message: 'Request body must be a JSON object' };

  const body = raw as Record<string, unknown>;

  // ── Required fields ─────────────────────────────────────────────────────

  if (!Array.isArray(body.inventoryItemIds))
    return { ok: false, message: 'inventoryItemIds must be an array' };

  const inventoryItemIds = sanitiseStringArray(body.inventoryItemIds, MAX_INVENTORY_IDS);
  if (!inventoryItemIds || inventoryItemIds.length === 0)
    return { ok: false, message: 'inventoryItemIds must contain at least one item' };

  if (!isNumber(body.adventurousness) || body.adventurousness < 1 || body.adventurousness > 5)
    return { ok: false, message: 'adventurousness must be a number between 1 and 5' };
  const adventurousness = Math.round(body.adventurousness) as 1 | 2 | 3 | 4 | 5;

  if (!isNumber(body.servings) || body.servings < 1 || body.servings > 20)
    return { ok: false, message: 'servings must be a number between 1 and 20' };
  const servings = Math.round(body.servings);

  // ── Optional fields ─────────────────────────────────────────────────────

  let moods: SuggestMealsRequest['moods'];
  if (body.moods !== undefined) {
    if (!Array.isArray(body.moods))
      return { ok: false, message: 'moods must be an array' };
    const filtered = body.moods.filter((m: unknown) => isString(m) && VALID_MOODS.has(m));
    moods = filtered.length > 0 ? filtered.slice(0, MAX_MOOD_COUNT) : undefined;
  }

  const hint = isString(body.hint) ? body.hint.trim().slice(0, MAX_HINT_LENGTH) || undefined : undefined;

  const likedMeals = body.likedMeals !== undefined
    ? sanitiseStringArray(body.likedMeals, MAX_LIKED_COUNT) ?? undefined
    : undefined;

  const dislikedMeals = body.dislikedMeals !== undefined
    ? sanitiseStringArray(body.dislikedMeals, MAX_DISLIKED_COUNT) ?? undefined
    : undefined;

  return {
    ok: true,
    data: {
      inventoryItemIds,
      adventurousness,
      servings,
      moods,
      hint,
      likedMeals: likedMeals && likedMeals.length > 0 ? likedMeals : undefined,
      dislikedMeals: dislikedMeals && dislikedMeals.length > 0 ? dislikedMeals : undefined,
    },
  };
}
