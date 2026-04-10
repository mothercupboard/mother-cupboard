import type { AIProvider, AIProviderName } from './types';
import { createAnthropicProvider } from './anthropic-provider';
import { createOpenAIProvider } from './openai-provider';

let cached: AIProvider | null = null;

/**
 * Returns the active AI provider based on environment configuration.
 *
 *  - `AI_PROVIDER`  — `"anthropic"` (default) or `"openai"`
 *  - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` — corresponding API key
 *
 * The instance is cached for the lifetime of the Lambda execution context
 * so repeated calls within the same invocation reuse the same client.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const providerName = (process.env.AI_PROVIDER ?? 'anthropic') as AIProviderName;

  switch (providerName) {
    case 'anthropic': {
      const key = requireEnv('ANTHROPIC_API_KEY');
      cached = createAnthropicProvider(key);
      break;
    }
    case 'openai': {
      const key = requireEnv('OPENAI_API_KEY');
      cached = createOpenAIProvider(key);
      break;
    }
    default:
      throw new Error(`Unknown AI_PROVIDER: "${providerName}". Expected "anthropic" or "openai".`);
  }

  return cached;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
