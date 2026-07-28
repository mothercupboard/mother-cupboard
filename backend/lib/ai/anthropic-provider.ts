import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, CompletionRequest, CompletionResponse } from './types';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Model used for `tier: 'fast'` requests (mechanical classification work).
 * Set ANTHROPIC_FAST_MODEL to a Haiku-class model to get the cheap/quick
 * path; unset, fast requests simply use the default model, so nothing
 * breaks if the name isn't configured.
 */
function modelFor(tier: 'default' | 'fast' | undefined): string {
  if (tier === 'fast')
    return process.env.ANTHROPIC_FAST_MODEL || DEFAULT_MODEL;
  return DEFAULT_MODEL;
}

export function createAnthropicProvider(apiKey: string): AIProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: 'anthropic',

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      // Anthropic separates the system prompt from the message array
      const systemMessages = request.messages.filter(m => m.role === 'system');
      const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

      const systemText = systemMessages.map(m => m.content).join('\n\n') || undefined;

      const response = await client.messages.create({
        model: modelFor(request.tier),
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: request.temperature,
        system: systemText,
        messages: nonSystemMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const textBlock = response.content.find(b => b.type === 'text');
      const content = textBlock?.type === 'text' ? textBlock.text : '';

      return {
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
        },
      };
    },
  };
}
