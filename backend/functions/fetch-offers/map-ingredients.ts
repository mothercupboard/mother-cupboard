/**
 * Ingredient mapping — one AI batch call per weekly offers run.
 *
 * Turns retail product names into canonical cooking ingredients so Suggest
 * can match offers against recipes and the user's cupboard, e.g.
 * "Pork Sizzle Steaks Gochujang, 0.44 KG" -> "pork steaks" (meat).
 * Also filters non-food (Aldi's Price Drops list has been known to include
 * a £79.99 beer dispenser).
 *
 * Uses the shared provider layer, so it runs on whichever AI_PROVIDER the
 * stage is configured with. A weekly batch of ~20-50 items is a few
 * thousand tokens — negligible cost on any provider.
 */

import { getAIProvider } from '../../lib/ai';
import type { MappedOffer, RawOffer } from './types';

const SYSTEM_PROMPT = [
  'You map UK supermarket offer products to canonical cooking ingredients.',
  'For each product in the input array return an object with:',
  '- product_name: copied exactly from the input',
  '- is_food: false for non-food, alcohol, pet food and vitamins; true otherwise',
  '- canonical_ingredient: the generic UK cooking ingredient a recipe would list, lowercase ("pork steaks", "turkey mince", "cherries", "crumbly white cheese"). For ready-to-eat items use the dish name ("garlic pizza bread"). null when is_food is false.',
  '- ingredient_category: one of meat, fish, fruit, veg, dairy, bakery, pantry, frozen, drinks, ready. null when is_food is false.',
  'Respond with ONLY a valid JSON object: {"items":[{"product_name":"...","is_food":true,"canonical_ingredient":"...","ingredient_category":"..."}]}',
].join('\n');

interface MappingItem {
  product_name: string;
  is_food: boolean;
  canonical_ingredient: string | null;
  ingredient_category: string | null;
}

const CATEGORIES = new Set([
  'meat', 'fish', 'fruit', 'veg', 'dairy', 'bakery', 'pantry', 'frozen', 'drinks', 'ready',
]);

export async function mapIngredients(offers: RawOffer[]): Promise<MappedOffer[]> {
  const provider = getAIProvider();

  const input = offers.map((o) => ({
    product_name: o.product_name,
    brand: o.brand,
    pack_size: o.pack_size,
  }));

  const response = await provider.complete({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ products: input }) },
    ],
    temperature: 0,
    maxTokens: 4096,
    responseFormat: 'json',
  });

  let items: MappingItem[];
  try {
    const parsed = JSON.parse(response.content);
    items = Array.isArray(parsed) ? parsed : parsed?.items;
    if (!Array.isArray(items)) throw new Error('no items array');
  } catch {
    throw new Error('Ingredient mapping returned invalid JSON');
  }

  const byName = new Map(items.map((m) => [m.product_name, m]));

  return offers.map((o) => {
    const m = byName.get(o.product_name);
    const category =
      m?.ingredient_category && CATEGORIES.has(m.ingredient_category)
        ? (m.ingredient_category as MappedOffer['ingredient_category'])
        : null;
    return {
      ...o,
      is_food: typeof m?.is_food === 'boolean' ? m.is_food : null,
      canonical_ingredient: m?.canonical_ingredient ?? null,
      ingredient_category: category,
    };
  });
}
