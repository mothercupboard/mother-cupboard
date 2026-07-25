import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { ApiResponse } from '@shared/types/api.types';
import * as Sentry from '@sentry/serverless';
import { getAIProvider } from '../../lib/ai';

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.STAGE ?? 'development',
  tracesSampleRate: 0.2,
});

// ── Types for the rich request format ───────────────────────────────────

interface InventoryItemForAI {
  name: string;
  quantity: number | null;
  unit: string | null;
  location: string;
  expiryDate: number | null;
  expiryType: string | null;
}

interface CookTrackRecord {
  /** Lifetime count of meals the user has marked as cooked. */
  totalCooked: number;
  /** How many of those were ambitious (adventurousness >= 4). */
  boldCooks: number;
  /** How many were cooked in the last 7 days (recent momentum). */
  recentCooks: number;
}

type RegionCode = 'GB' | 'IE' | 'AU' | 'NZ';

/** A supermarket offer relevant to this user (Saver Cupboard). */
interface OfferForAI {
  /** Canonical ingredient, e.g. "pork steaks". */
  ingredient: string;
  /** Retail product name, e.g. "Pork Sizzle Steaks Gochujang". */
  productName: string;
  /** Display name of the retailer, e.g. "Aldi". */
  retailer: string;
  pricePence: number;
  wasPricePence: number | null;
  packSize: string | null;
}

interface SuggestRequestV2 {
  items: InventoryItemForAI[];
  adventurousness: number;
  servings: number;
  moods?: string[];
  hint?: string;
  likedMeals?: string[];
  dislikedMeals?: string[];
  cookHistory?: CookTrackRecord;
  region: RegionCode;
  /** This week's offers at the user's chosen supermarket(s), if any. */
  offers?: OfferForAI[];
}

// ── Region ──────────────────────────────────────────────────────────────

/**
 * Per-region vocabulary guidance. Keeps the main prompt region-neutral and
 * carries the spelling / ingredient-naming / cooking-term differences here.
 * All Phase 1 regions are metric and use "grill" (never the US "broil").
 */
const REGION_PROFILES: Record<RegionCode, { country: string; english: string; ingredients: string }> = {
  GB: {
    country: 'the United Kingdom',
    english: 'UK English (colour, flavour, minimise, centre)',
    ingredients: 'Use UK ingredient names: coriander (not cilantro), aubergine (not eggplant), courgette (not zucchini), rocket (not arugula), spring onion, mince, prawns (not shrimp). Say "grill", never "broil".',
  },
  IE: {
    country: 'Ireland',
    english: 'Irish English, which uses UK spelling (colour, flavour, centre)',
    ingredients: 'Use UK/Irish ingredient names: coriander, aubergine, courgette, rocket, spring onion, mince, prawns. Say "grill", never "broil".',
  },
  AU: {
    country: 'Australia',
    english: 'Australian English (colour, flavour, minimise, centre)',
    ingredients: 'Use Australian ingredient names: capsicum (not bell pepper), zucchini (not courgette), eggplant (not aubergine), rocket (not arugula), coriander (not cilantro), prawns (not shrimp), mince, snow peas. Say "grill", never "broil".',
  },
  NZ: {
    country: 'New Zealand',
    english: 'New Zealand English, which uses UK spelling (colour, flavour, centre)',
    ingredients: 'Use New Zealand ingredient names: capsicum (not bell pepper), kūmara (for sweet potato), courgette or zucchini, aubergine or eggplant, rocket, coriander, prawns, mince. Say "grill", never "broil".',
  },
};

function buildRegionDirective(region: RegionCode): string {
  const p = REGION_PROFILES[region] ?? REGION_PROFILES.GB;
  return (
    `REGION: This cook is in ${p.country}. Write everything — description, reason and steps — in ${p.english}. `
    + `${p.ingredients} `
    + 'Use metric units (g, kg, ml, litres) and °C for oven temperatures.'
  );
}

// ── Prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = [
  // ── Who you are ──────────────────────────────────────────────────────────
  'You are Mother Cupboard: the warm, thrifty heart of a home kitchen, speaking directly to one home cook through a food-waste app. You help them make a proper meal from what they already have. You are on their side — resourceful, encouraging, and never pretentious.',
  // ── Voice ────────────────────────────────────────────────────────────────
  'VOICE: Write in warm, plain-spoken English in the cook\'s regional variety (specified in the REGION note), like a capable home cook who genuinely cares. Be gently thrifty and quietly proud of using things up. Be encouraging, never preachy.',
  'NEVER sound cheffy or pretentious — avoid words like "elevate", "deconstruct", "restaurant-quality", "gourmet", "vibrant", "umami bomb". NEVER use AI-speak like "As an AI", "Certainly!", or "Here is a recipe". Do not pile on gushing adjectives or exclamation marks. Never lecture about health, diet or waste, and never shame a simple choice.',
  // ── Match energy to the adventurousness dial ──────────────────────────────
  'MATCH YOUR ENERGY TO THE ADVENTUROUSNESS LEVEL (1-5). At 1-2, keep it comforting, simple and reassuring. At 3, a steady step up. At 4-5, be genuinely pleased they are having a go: encouraging and a touch excited, championing the ambition and quietly flagging the trickiest step so they succeed. Never talk anyone out of an ambitious choice, never call it "too much faff", and at high levels do NOT fall back to cheap or plain cooking. Ambitious, yes — but still a home cook doing something special, not a chef showing off.',
  // ── Their track record ────────────────────────────────────────────────────
  'If a cooking track record is provided, treat them like the cook they have shown themselves to be — but only ever reference a REAL pattern, never invent one. A regular at ambitious cooking can be spoken to cook-to-cook with less hand-holding; someone reaching higher than their usual deserves a little extra reassurance; someone on a recent roll can be acknowledged warmly. With little or no history, make no assumptions.',
  // ── The job ───────────────────────────────────────────────────────────────
  'Given a list of inventory items (with optional expiry info), suggest practical meals that:',
  '- ONLY use ingredients from the provided inventory list in the "ingredients" field. Do NOT invent or assume ingredients the user has not listed.',
  '- Any ingredient NOT in the inventory MUST go in "missingIngredients" instead.',
  '- Prioritise items approaching their use-by or best-before dates.',
  '- Are realistic for everyday home cooking, scaled to the requested number of servings.',
  '- Always use the spelling and ingredient names specified in the REGION note below — this matters, so follow it exactly.',
  'RESPECT HOW ITEMS ARE ALREADY PREPARED: read each item name carefully. If a product is already seasoned, marinated, breaded, spiced, or clearly sold ready-to-cook (e.g. "Moroccan chicken kebabs", "marinated tofu", "garlic bread", "breaded fish"), do NOT tell the user to marinate, season or coat it again — just cook it as-is. Never add preparation steps that duplicate work the product already comes with. Getting this wrong is frustrating, so err towards simplicity for ready-made items.',
  'FREEZER ITEMS ARE NOT URGENT: items tagged [freezer] are frozen and keep for a long time, so do NOT treat their expiry date as pressing or prioritise them the way you would fresh items about to go off. Only build a meal around a frozen item if the user specifically asks to use it. When a suggestion does use a frozen item, mention in the description or first step that it needs defrosting first (ideally overnight in the fridge, or taken out that morning).',
  'CRITICAL: The "ingredients" array must ONLY contain items that appear in the user\'s inventory. If a recipe needs chicken but the user has no chicken, it goes in "missingIngredients". Suggest meals that minimise missing ingredients.',
  'Respond with ONLY a valid JSON object matching this schema:',
  '{',
  '  "suggestions": [',
  '    {',
  '      "id": "<unique short id>",',
  '      "title": "<plain, appetising home-cook name for the dish>",',
  '      "description": "<1-2 sentences in Mother Cupboard\'s warm voice: what it is and why it is a good shout>",',
  '      "reason": "<ONE short, warm sentence in Mother Cupboard\'s voice explaining why THIS meal, for THIS cook, right now — grounded in a REAL detail: an item about to turn, something they have plenty of, the adventurousness they chose, or their track record. Max ~20 words. Always specific, never generic.>",',
  '      "ingredients": ["200g chicken breast", "1 tbsp olive oil", "2 cloves garlic"],',
  '      "missingIngredients": ["1 tbsp soy sauce", "1 tsp sesame oil"],',
  '      "equipment": ["<kitchen equipment / utensils needed>"],',
  '      "adventurousness": <1-5>,',
  '      "estimatedCookTime": <minutes>,',
  '      "usesExpiringItems": <true if it prioritises soon-to-expire items>,',
  '      "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]',
  '    }',
  '  ]',
  '}',
  'IMPORTANT: Every ingredient (both from inventory and missing) MUST include a specific quantity scaled to the requested number of servings (e.g. "200g chicken breast", "1 tbsp olive oil", "2 medium onions", "400ml coconut milk"). Never list an ingredient without a quantity.',
  'Write the "description", "reason" and "steps" all in Mother Cupboard\'s voice. Keep the steps clear and practical — 4-8 of them.',
  'Return 3 suggestions unless the inventory is very limited (then return as many as practical).',
].join('\n');

const MOOD_DESCRIPTIONS: Record<string, string> = {
  quick: 'Quick meals (under 30 minutes)',
  comfort: 'Comfort food — hearty, warming, satisfying',
  healthy: 'Healthy and nutritious options',
  'leftover-rescue': 'Creative ways to use up leftovers and odds-and-ends',
  'batch-cook': 'Batch cooking — makes enough to freeze or eat across the week',
  'one-pot': 'One-pot or one-pan meals (minimal washing up)',
  'kid-friendly': 'Kid-friendly meals the whole family will enjoy',
  favourite: "Suggest meals similar to the user's favourited meals — comfort picks they already love",
};

// ── Offers (Saver Cupboard) ─────────────────────────────────────────────

function formatPrice(pence: number): string {
  return pence < 100 ? `${pence}p` : `£${(pence / 100).toFixed(2)}`;
}

/**
 * Extra system directive, only sent when the request includes offers.
 * Additive by design: with no offers the prompt is byte-identical to before.
 */
function buildOffersDirective(offers: OfferForAI[]): string {
  const lines = offers.map((o) => {
    const was = o.wasPricePence != null ? ` (was ${formatPrice(o.wasPricePence)})` : '';
    const size = o.packSize ? `, ${o.packSize}` : '';
    return `- ${o.ingredient}: ${o.productName}${size} at ${formatPrice(o.pricePence)}${was} [${o.retailer}]`;
  });
  return (
    'OFFERS THIS WEEK at the user\'s chosen supermarket(s):\n'
    + lines.join('\n')
    + '\nWhen choosing between otherwise good suggestions, prefer meals whose MISSING ingredients appear in this offers list — that makes the meal cheaper to complete. '
    + 'When a suggestion does use an offer, you may mention it naturally and briefly in the description or reason (e.g. "pork steaks are £2.99 at Aldi this week") in Mother Cupboard\'s voice — thrifty, never salesy. '
    + 'Never force an offer into a meal where it does not belong, never invent offers not in this list, and never mention offers for ingredients the meal does not use. '
    + 'The offers list does NOT change the inventory rules: offers are things the user could buy, so they belong in "missingIngredients" unless also in the inventory.'
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatItems(items: InventoryItemForAI[]): string {
  return items
    .map((i) => {
      let desc = '- ' + i.name;
      if (i.quantity != null) desc += ' (' + i.quantity + (i.unit ? ' ' + i.unit : '') + ')';
      desc += ' [' + i.location + ']';
      if (i.expiryDate) {
        const d = new Date(i.expiryDate).toLocaleDateString('en-GB');
        const label = i.expiryType === 'use_by' ? 'use by' : 'best before';
        desc += ' ' + label + ' ' + d;
      }
      return desc;
    })
    .join('\n');
}

function buildUserPrompt(body: SuggestRequestV2): string {
  const lines = [
    'Inventory items:\n' + formatItems(body.items),
    'Adventurousness level: ' + body.adventurousness + '/5',
    'Servings: ' + body.servings,
  ];
  if (body.moods && body.moods.length > 0) {
    lines.push('Mood / preferences: ' + body.moods.map((m) => MOOD_DESCRIPTIONS[m] ?? m).join('; '));
  }
  if (body.likedMeals && body.likedMeals.length > 0) {
    lines.push('Previously enjoyed: ' + body.likedMeals.join(', '));
  }
  if (body.dislikedMeals && body.dislikedMeals.length > 0) {
    lines.push('Avoid similar to: ' + body.dislikedMeals.join(', '));
  }
  if (body.hint) {
    lines.push('Additional request: ' + body.hint);
  }
  if (body.cookHistory && body.cookHistory.totalCooked > 0) {
    const h = body.cookHistory;
    lines.push(
      'Cooking track record: '
      + `${h.totalCooked} meals cooked in total, `
      + `${h.boldCooks} of them ambitious (level 4-5), `
      + `${h.recentCooks} in the last week. `
      + 'Use this only if a genuine pattern stands out; otherwise ignore it.',
    );
  }
  return lines.join('\n');
}

function parseOffers(raw: unknown): OfferForAI[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const offers: OfferForAI[] = [];
  for (const item of raw.slice(0, 100)) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const ingredient = typeof o.ingredient === 'string' ? o.ingredient.slice(0, 100).trim() : '';
    const productName = typeof o.productName === 'string' ? o.productName.slice(0, 200).trim() : '';
    const pricePence = typeof o.pricePence === 'number' && Number.isFinite(o.pricePence)
      ? Math.max(0, Math.round(o.pricePence))
      : null;
    if (!ingredient || !productName || pricePence == null) continue;
    offers.push({
      ingredient,
      productName,
      retailer: typeof o.retailer === 'string' ? o.retailer.slice(0, 50).trim() : 'the supermarket',
      pricePence,
      wasPricePence: typeof o.wasPricePence === 'number' && Number.isFinite(o.wasPricePence)
        ? Math.max(0, Math.round(o.wasPricePence))
        : null,
      packSize: typeof o.packSize === 'string' ? o.packSize.slice(0, 50) : null,
    });
  }
  return offers.length > 0 ? offers : undefined;
}

function parseCookHistory(raw: unknown): CookTrackRecord | undefined {
  if (typeof raw !== 'object' || raw === null)
    return undefined;
  const h = raw as Record<string, unknown>;
  const num = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
  const rec: CookTrackRecord = {
    totalCooked: num(h.totalCooked),
    boldCooks: num(h.boldCooks),
    recentCooks: num(h.recentCooks),
  };
  return rec.totalCooked > 0 ? rec : undefined;
}

function validateRequest(raw: unknown): { ok: true; data: SuggestRequestV2 } | { ok: false; message: string } {
  if (typeof raw !== 'object' || raw === null)
    return { ok: false, message: 'Request body must be a JSON object' };

  const body = raw as Record<string, unknown>;

  if (!Array.isArray(body.items) || body.items.length === 0)
    return { ok: false, message: 'items must be a non-empty array' };

  const items: InventoryItemForAI[] = body.items.slice(0, 500).map((item: any) => ({
    name: String(item.name ?? '').slice(0, 200),
    quantity: typeof item.quantity === 'number' ? item.quantity : null,
    unit: typeof item.unit === 'string' ? item.unit.slice(0, 50) : null,
    location: String(item.location ?? 'cupboard').slice(0, 50),
    expiryDate: typeof item.expiryDate === 'number' ? item.expiryDate : null,
    expiryType: typeof item.expiryType === 'string' ? item.expiryType.slice(0, 20) : null,
  }));

  const adventurousness = Math.max(1, Math.min(5, Math.round(Number(body.adventurousness) || 3)));
  const servings = Math.max(1, Math.min(20, Math.round(Number(body.servings) || 2)));
  const region: RegionCode
    = body.region === 'IE' || body.region === 'AU' || body.region === 'NZ' ? body.region : 'GB';

  return {
    ok: true,
    data: {
      items,
      adventurousness,
      servings,
      region,
      moods: Array.isArray(body.moods) ? body.moods.filter((m: unknown) => typeof m === 'string').slice(0, 8) : undefined,
      hint: typeof body.hint === 'string' ? body.hint.slice(0, 500) : undefined,
      likedMeals: Array.isArray(body.likedMeals) ? body.likedMeals.filter((m: unknown) => typeof m === 'string').slice(0, 50) : undefined,
      dislikedMeals: Array.isArray(body.dislikedMeals) ? body.dislikedMeals.filter((m: unknown) => typeof m === 'string').slice(0, 50) : undefined,
      cookHistory: parseCookHistory(body.cookHistory),
      offers: parseOffers(body.offers),
    },
  };
}

function jsonResponse(statusCode: number, body: ApiResponse<unknown>): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// ── Handler ─────────────────────────────────────────────────────────────

export const handler = Sentry.AWSLambda.wrapHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (!event.body) {
      return jsonResponse(400, {
        data: null,
        error: { code: 'BAD_REQUEST', message: 'Request body is required', retryable: false },
      });
    }

    let rawBody: unknown;
    try {
      rawBody = JSON.parse(event.body);
    } catch {
      return jsonResponse(400, {
        data: null,
        error: { code: 'BAD_REQUEST', message: 'Invalid JSON body', retryable: false },
      });
    }

    const validation = validateRequest(rawBody);
    if (!validation.ok) {
      return jsonResponse(400, {
        data: null,
        error: { code: 'VALIDATION_ERROR', message: validation.message, retryable: false },
      });
    }

    const body = validation.data;

    try {
      const provider = getAIProvider();
      const messages: Parameters<typeof provider.complete>[0]['messages'] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: buildRegionDirective(body.region) },
      ];
      if (body.offers && body.offers.length > 0) {
        messages.push({ role: 'system', content: buildOffersDirective(body.offers) });
      }
      messages.push({ role: 'user', content: buildUserPrompt(body) });

      const response = await provider.complete({
        messages,
        temperature: 0.7,
        maxTokens: 2048,
        responseFormat: 'json',
      });

      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch {
        return jsonResponse(502, {
          data: null,
          error: { code: 'AI_PARSE_ERROR', message: 'AI returned invalid JSON', retryable: true },
        });
      }

      const suggestions = Array.isArray(parsed) ? parsed : parsed?.suggestions;
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        return jsonResponse(502, {
          data: null,
          error: { code: 'AI_EMPTY_RESPONSE', message: 'No suggestions returned. Please try again.', retryable: true },
        });
      }

      return jsonResponse(200, { data: suggestions, error: null });
    } catch (err) {
      Sentry.captureException(err);
      return jsonResponse(500, {
        data: null,
        error: { code: 'AI_ERROR', message: 'Failed to generate meal suggestions', retryable: true },
      });
    }
  },
);
