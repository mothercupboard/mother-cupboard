import OpenAI from 'openai';
import type { AIProvider, CompletionRequest, CompletionResponse } from './types';

const DEFAULT_MODEL = 'gpt-4o';
/** Small/cheap model for mechanical work — see CompletionRequest.tier. */
const FAST_MODEL = 'gpt-4o-mini';
const DEFAULT_MAX_TOKENS = 1024;

export function createOpenAIProvider(apiKey: string): AIProvider {
  const client = new OpenAI({ apiKey });

  return {
    name: 'openai',

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const response = await client.chat.completions.create({
        model: request.tier === 'fast' ? FAST_MODEL : DEFAULT_MODEL,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: request.temperature,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        ...(request.responseFormat === 'json' && {
          response_format: { type: 'json_object' },
        }),
      });

      const choice = response.choices[0];

      return {
        content: choice?.message?.content ?? '',
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
