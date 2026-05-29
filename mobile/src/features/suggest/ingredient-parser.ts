/**
 * Parses AI-generated ingredient strings into structured data for inventory deduction.
 *
 * The staple check has moved to `staples-store.ts` (`isStaple`) so users can
 * customise their own staples list; this parser only handles name/quantity/unit.
 *
 * Examples:
 *   "200g plain flour"         → { name: "plain flour",  quantity: 200, unit: "g" }
 *   "300ml semi-skimmed milk"  → { name: "semi-skimmed milk", quantity: 300, unit: "ml" }
 *   "2 large eggs"             → { name: "eggs",          quantity: 2,   unit: null }
 *   "3 cloves garlic"          → { name: "garlic",         quantity: 3,   unit: "cloves" }
 *   "1 tbsp olive oil"         → { name: "olive oil",     quantity: 1,   unit: "tbsp" }
 *   "salt and pepper"          → { name: "salt and pepper", quantity: null, unit: null }
 */

export type ParsedIngredient = {
  /** Original string from the AI. */
  raw: string;
  /** Cleaned ingredient name, lowercased, descriptors removed. */
  name: string;
  /** Numeric quantity (null if none found). */
  quantity: number | null;
  /** Normalised unit string (null if none or unrecognised). */
  unit: string | null;
};

/** Maps common unit spellings to a normalised form. */
const UNIT_ALIASES: Record<string, string> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  clove: 'cloves',
  cloves: 'cloves',
};

/** Descriptors to strip from the beginning of an ingredient name. */
const DESCRIPTOR_RE = /^(large|medium|small|fresh|dried|frozen|cooked|raw|whole|chopped|sliced|diced|roughly|finely|thinly|peeled|grated|minced)\s+/gi;

/** Matches: optional leading number, optional unit token, remaining text. */
const AMOUNT_RE = /^(\d+(?:[.,]\d+)?)\s*([a-z]+)?\s*(.*)/i;

function cleanName(raw: string): string {
  return raw.replace(DESCRIPTOR_RE, '').trim();
}

export function parseIngredient(raw: string): ParsedIngredient {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  const match = lower.match(AMOUNT_RE);

  if (!match) {
    // No leading number — pure name (e.g. "salt", "fresh parsley")
    const name = cleanName(lower);
    return { raw, name, quantity: null, unit: null };
  }

  const [, quantityStr, possibleUnit, rest] = match;
  const quantity = Number.parseFloat(quantityStr.replace(',', '.'));
  const normUnit = possibleUnit ? UNIT_ALIASES[possibleUnit.toLowerCase()] : undefined;

  if (normUnit) {
    // e.g. "200g plain flour" or "300ml milk"
    const name = cleanName(rest.trim() || possibleUnit);
    return { raw, name, quantity, unit: normUnit };
  }
  else {
    // e.g. "2 large eggs" or "3 cloves garlic"
    const nameParts = [possibleUnit, rest].filter(Boolean).join(' ').trim();
    const name = cleanName(nameParts);
    return { raw, name, quantity, unit: null };
  }
}
