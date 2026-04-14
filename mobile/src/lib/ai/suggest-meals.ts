import Env from 'env';

export interface InventoryItemForAI {
  name: string;
  quantity: number | null;
  unit: string | null;
  location: string;
  expiryDate: number | null;
  expiryType: string | null;
}

export interface LocalSuggestRequest {
  items: InventoryItemForAI[];
  adventurousness: number;
  servings: number;
  moods?: string[];
  hint?: string;
  likedMeals?: string[];
  dislikedMeals?: string[];
}

const SYSTEM_PROMPT = [
  'You are a helpful meal-planning assistant for a UK household food waste app called Mother Cupboard.',
  'Given a list of inventory items (with optional expiry info), suggest practical meals that:',
  '- Prioritise items approaching their use-by or best-before dates',
  '- Use ingredients the household already has',
  '- Are realistic for home cooking in the UK',
  '- Match the requested adventurousness level (1 = simple comfort food, 5 = ambitious)',
  'Respond with ONLY a valid JSON object matching this schema:',
  '{',
  '  "suggestions": [',
  '    {',
  '      "id": "<unique short id>",',
  '      "title": "<meal name>",',
  '      "description": "<1-2 sentence description>",',
  '      "ingredients": ["<items from inventory used>"],',
  '      "missingIngredients": ["<common items NOT in inventory that are needed>"],',
  '      "adventurousness": <1-5>,',
  '      "estimatedCookTime": <minutes>,',
  '      "usesExpiringItems": <true if it prioritises soon-to-expire items>',
  '    }',
  '  ]',
  '}',
  'Return 3 suggestions unless the inventory is very limited (then return as many as practical).',
].join('\n');

const MOOD_DESCRIPTIONS: Record<string, string> = {
  quick: 'Quick meals (under 30 minutes)',
  comfort: 'Comfort food — hearty, warming, satisfying',
  healthy: 'Healthy and nutritious options',
  'leftover-rescue': 'Creative ways to use up leftovers and odds-and-ends',
  'batch-cook': 'Batch cooking — makes enough to freeze or eat across the week',
  budget: 'Budget-friendly meals',
  'one-pot': 'One-pot or one-pan meals (minimal washing up)',
  'kid-friendly': 'Kid-friendly meals the whole family will enjoy',
};

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

function buildUserPrompt(req: LocalSuggestRequest): string {
  const lines = [
    'Inventory items:\n' + formatItems(req.items),
    'Adventurousness level: ' + req.adventurousness + '/5',
    'Servings: ' + req.servings,
  ];
  if (req.moods && req.moods.length > 0) {
    lines.push('Mood / preferences: ' + req.moods.map((m) => MOOD_DESCRIPTIONS[m] ?? m).join('; '));
  }
  if (req.likedMeals && req.likedMeals.length > 0) {
    lines.push('Previously enjoyed: ' + req.likedMeals.join(', '));
  }
  if (req.dislikedMeals && req.dislikedMeals.length > 0) {
    lines.push('Avoid similar to: ' + req.dislikedMeals.join(', '));
  }
  if (req.hint) {
    lines.push('Additional request: ' + req.hint);
  }
  return lines.join('\n');
}

export async function suggestMealsLocal(req: LocalSuggestRequest) {
  const apiKey = Env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(req) },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('OpenAI error ' + response.status + ': ' + errText.slice(0, 200));
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);
  const suggestions = parsed.suggestions;
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    throw new Error('No suggestions returned');
  }
  return suggestions;
}
