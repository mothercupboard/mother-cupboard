import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { SuggestMealsRequest } from '@shared/types/meal-suggestion.types';
import type { ApiResponse } from '@shared/types/api.types';
import * as Sentry from '@sentry/serverless';
import { getAIProvider } from '../../lib/ai';
import { validateSuggestRequest } from '../../lib/validation/validate-request';
import { verifyAIResponse } from '../../lib/validation/verify-ai-response';

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.STAGE ?? 'development',
  tracesSampleRate: 0.2,
});

const SYSTEM_PROMPT = `You are a helpful meal-planning assistant for a UK household food waste app called Mother Cupboard.

Given a list of inventory items (with optional expiry info), suggest practical meals that:
- Prioritise items approaching their use-by or best-before dates
- Use ingredients the household already has
- Are realistic for home cooking in the UK
- Match the requested adventurousness level (1 = simple comfort food, 5 = ambitious)

Respond with ONLY a valid JSON object matching this schema — no markdown, no explanation:
{
  "suggestions": [
    {
      "id": "<unique short id>",
      "title": "<meal name>",
      "description": "<1-2 sentence description>",
      "ingredients": ["<items from inventory used>"],
      "missingIngredients": ["<common items NOT in inventory that are needed>"],
      "adventurousness": <1-5>,
      "estimatedCookTime": <minutes>,
      "usesExpiringItems": <true if it prioritises soon-to-expire items>
    }
  ]
}

Return 3 suggestions unless the inventory is very limited (then return as many as practical).`;

const MOOD_DESCRIPTIONS: Record<string, string> = {
  'quick': 'Quick meals (under 30 minutes)',
  'comfort': 'Comfort food — hearty, warming, satisfying',
  'healthy': 'Healthy and nutritious options',
  'leftover-rescue': 'Creative ways to use up leftovers and odds-and-ends',
  'batch-cook': 'Batch cooking — makes enough to freeze or eat across the week',
  'budget': 'Budget-friendly meals',
  'one-pot': 'One-pot or one-pan meals (minimal washing up)',
  'kid-friendly': 'Kid-friendly meals the whole family will enjoy',
};

function buildUserPrompt(body: SuggestMealsRequest): string {
  const lines = [
    `Inventory items: ${body.inventoryItemIds.join(', ')}`,
    `Adventurousness level: ${body.adventurousness}/5`,
    `Servings: ${body.servings}`,
  ];

  if (body.moods && body.moods.length > 0) {
    const moodLines = body.moods
      .map(m => MOOD_DESCRIPTIONS[m] ?? m)
      .join('; ');
    lines.push(`Mood / preferences: ${moodLines}`);
  }

  if (body.likedMeals && body.likedMeals.length > 0) {
    lines.push(`The user previously enjoyed these meals (suggest similar styles): ${body.likedMeals.join(', ')}`);
  }

  if (body.dislikedMeals && body.dislikedMeals.length > 0) {
    lines.push(`The user rejected these meals (avoid similar styles): ${body.dislikedMeals.join(', ')}`);
  }

  if (body.hint) {
    lines.push(`Additional request: ${body.hint}`);
  }

  return lines.join('\n');
}

function jsonResponse(statusCode: number, body: ApiResponse<unknown>): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler = Sentry.AWSLambda.wrapHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // ── 1. Parse raw JSON ───────────────────────────────────────────────
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

    // ── 2. Validate & sanitise request ──────────────────────────────────
    const validation = validateSuggestRequest(rawBody);
    if (!validation.ok) {
      return jsonResponse(400, {
        data: null,
        error: { code: 'VALIDATION_ERROR', message: validation.message, retryable: false },
      });
    }

    const body = validation.data;

    // ── 3. Call AI provider ─────────────────────────────────────────────
    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(body) },
        ],
        temperature: 0.7,
        maxTokens: 2048,
        responseFormat: 'json',
      });

      // ── 4. Verify & sanitise AI response ────────────────────────────
      const { suggestions, droppedCount } = verifyAIResponse(response.content);

      if (suggestions.length === 0) {
        Sentry.captureMessage('AI returned zero valid suggestions', {
          level: 'warning',
          extra: { droppedCount, rawContent: response.content.slice(0, 500) },
        });
        return jsonResponse(502, {
          data: null,
          error: {
            code: 'AI_EMPTY_RESPONSE',
            message: 'Could not generate valid suggestions. Please try again.',
            retryable: true,
          },
        });
      }

      if (droppedCount > 0) {
        Sentry.captureMessage(`Dropped ${droppedCount} malformed AI suggestions`, {
          level: 'info',
          extra: { droppedCount, validCount: suggestions.length },
        });
      }

      return jsonResponse(200, { data: suggestions, error: null });
    } catch (err) {
      Sentry.captureException(err);
      return jsonResponse(500, {
        data: null,
        error: {
          code: 'AI_ERROR',
          message: 'Failed to generate meal suggestions',
          retryable: true,
        },
      });
    }
  },
);
