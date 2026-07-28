/**
 * Provider-agnostic AI types.
 *
 * Every LLM adapter implements the {@link AIProvider} interface so the
 * business logic (prompt construction, response parsing) never couples
 * to a specific vendor SDK.
 */

// ─── Chat message primitives ──────────────────────────────────────────────

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// ─── Completion request / response ────────────────────────────────────────

export interface CompletionRequest {
  messages: ChatMessage[];
  /** Maximum tokens to generate. */
  maxTokens?: number;
  /**
   * Sampling temperature (0 = deterministic, 1 = creative).
   * Providers that use a different scale should normalise internally.
   */
  temperature?: number;
  /**
   * Optional JSON-schema hint. When provided the adapter should instruct
   * the model to respond with valid JSON matching this shape. Not all
   * providers support structured output natively — adapters that don't
   * should append the schema to the system prompt as guidance.
   */
  responseFormat?: 'json';
  /**
   * Which class of model to use. Provider-agnostic on purpose: each adapter
   * maps the tier to its own model name.
   *
   *  - `'default'` — the capable model, for judgement-heavy work (recipe
   *    suggestions, anything user-facing and creative).
   *  - `'fast'` — the small, cheap, quick model, for mechanical work like
   *    classification and extraction. Roughly an order of magnitude cheaper
   *    and several times faster, with no meaningful accuracy loss on tasks
   *    that amount to sorting things into buckets.
   *
   * Defaults to `'default'` when unset, so existing callers are unaffected.
   */
  tier?: 'default' | 'fast';
}

export interface CompletionResponse {
  content: string;
  /** Provider-reported token counts — useful for cost tracking / logging. */
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

// ─── Provider interface ───────────────────────────────────────────────────

export type AIProviderName = 'anthropic' | 'openai';

export interface AIProvider {
  readonly name: AIProviderName;
  /**
   * Send a chat-completion request and return the first choice.
   * Throws on network / auth / rate-limit errors — callers handle retries.
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}
