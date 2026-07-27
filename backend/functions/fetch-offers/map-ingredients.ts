/**
 * Ingredient mapping — turn retail product names into canonical cooking
 * ingredients so Suggest can match offers against recipes and the user's
 * cupboard, e.g. "Pork Sizzle Steaks Gochujang, 0.44 KG" -> "pork steaks"
 * (meat). Also filters non-food (Aldi's Price Drops has included a £79.99
 * beer dispenser; supermarket specials include laundry capsules, razors...).
 *
 * Runs in CHUNKS: with four countries live a weekly run is ~200+ products,
 * which overflows a single model response (truncated -> invalid JSON). Each
 * chunk is a separate AI call, so responses stay well within the token
 * budget and the run scales as more retailers are added. A chunk that fails
 * to parse is skipped (its offers keep is_food = null and are simply not
 * surfaced) rather than failing the whole weekly run.
 *
 * Uses the shared provider layer (whichever AI_PROVIDER the stage sets).
 */

import { getAIProvider } from '../../lib/ai';
import type { MappedOffer, RawOffer } from './types';

const SYSTEM_PROMPT = [
  'You map supermarket offer products (from UK, Irish, Australian or New Zealand supermarkets) to canonical cooking ingredients.',
  'For each product in the input array return an object with:',
  '- product_name: copied exactly from the input',
  '- is_food: false for non-food, alcohol, pet food and vitamins; true otherwise',
  '- is_ingredient: true ONLY if the product would plausibly appear on a home recipe\'s ingredient list — meat, fish, fruit, vegetables, dairy, eggs, bread, pasta, rice, tinned goods, cooking oils, herbs/spices, baking supplies, frozen ingredients. false for things people eat or drink but never cook WITH: crisps, biscuits, confectionery, chocolate bars (baking chocolate is true), cereals, tea bags, coffee, soft drinks, juice, ready meals, pizzas, snack pots. false whenever is_food is false.',
  '- canonical_ingredient: the generic cooking ingredient a recipe would list, lowercase, in the vocabulary of the product\'s own country ("pork steaks", "turkey mince", "cherries", "crumbly white cheese"). For ready-to-eat items use the dish name ("garlic pizza bread"). null when is_food is false.',
  '- ingredient_category: one of meat, fish, fruit, veg, dairy, bakery, pantry, frozen, drinks, ready. null when is_food is false.',
  'Respond with ONLY a valid JSON object: {"items":[{"product_name":"...","is_food":true,"is_ingredient":true,"canonical_ingredient":"...","ingredient_category":"..."}]}',
].join('\n');

// ~40 products/call keeps each response comfortably under the token limit.
const CHUNK_SIZE = 40;

interface MappingItem {
  product_name: string;
  is_food: boolean;
  is_ingredient: boolean;
  canonical_ingredient: string | null;
  ingredient_category: string | null;
}

const CATEGORIES = new Set([
  'meat', 'fish', 'fruit', 'veg', 'dairy', 'bakery', 'pantry', 'frozen', 'drinks', 'ready',
]);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size)
    out.push(arr.slice(i, i + size));
  return out;
}

async function mapChunk(offers: RawOffer[]): Promise<MappingItem[]> {
  const provider = getAIProvider();
  const input = offers.map(o => ({ product_name: o.product_name, brand: o.brand, pack_size: o.pack_size }));

  const response = await provider.complete({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ products: input }) },
    ],
    temperature: 0,
    maxTokens: 4096,
    responseFormat: 'json',
  });

  const parsed = JSON.parse(response.content);
  const items = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(items))
    throw new Error('mapping response had no items array');
  return items as MappingItem[];
}

export async function mapIngredients(offers: RawOffer[]): Promise<MappedOffer[]> {
  const byName = new Map<string, MappingItem>();

  for (const group of chunk(offers, CHUNK_SIZE)) {
    try {
      for (const m of await mapChunk(group))
        byName.set(m.product_name, m);
    }
    catch (err) {
      // Skip this chunk rather than failing the whole weekly run — its
      // offers stay unmapped (is_food null) and are just not surfaced.
      console.error(`[fetch-offers] ingredient mapping chunk failed (${group.length} items):`, err);
    }
  }

  return offers.map((o) => {
    const m = byName.get(o.product_name);
    const category =
      m?.ingredient_category && CATEGORIES.has(m.ingredient_category)
        ? (m.ingredient_category as MappedOffer['ingredient_category'])
        : null;
    return {
      ...o,
      is_food: typeof m?.is_food === 'boolean' ? m.is_food : null,
      is_ingredient: typeof m?.is_ingredient === 'boolean' ? m.is_ingredient : null,
      canonical_ingredient: m?.canonical_ingredient ?? null,
      ingredient_category: category,
    };
  });
}
