import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, CompletionRequest, CompletionResponse } from './types';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 1024;

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
        model: DEFAULT_MODEL,
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
