/**
 * LLM Service — Unified interface for Groq and DeepSeek
 * Both use OpenAI-compatible /chat/completions API format.
 * Automatic fallback: Groq → DeepSeek on failure.
 */

export interface LLMConfig {
  provider: "groq" | "deepseek";
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Get available LLM configurations from environment.
 * Returns configs in priority order: Groq first, DeepSeek second.
 */
export function getAvailableConfigs(userKeys?: { groq?: string; deepseek?: string }): LLMConfig[] {
  const configs: LLMConfig[] = [];

  const groqKey = userKeys?.groq || process.env.GROQ_API_KEY;
  if (groqKey) {
    configs.push({
      provider: "groq",
      apiKey: groqKey,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    });
  }

  const dsKey = userKeys?.deepseek || process.env.DEEPSEEK_API_KEY;
  if (dsKey) {
    configs.push({
      provider: "deepseek",
      apiKey: dsKey,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    });
  }

  return configs;
}

/**
 * Make a single LLM completion call.
 */
async function callLLM(
  config: LLMConfig,
  request: LLMRequest
): Promise<LLMResponse> {
  const url = `${config.baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages: request.messages,
    temperature: request.temperature ?? config.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? config.maxTokens ?? 4096,
  };

  if (request.responseFormat) {
    body.response_format = request.responseFormat;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM API error (${config.provider}): ${response.status} — ${errorText}`
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    throw new Error(`LLM returned empty response (${config.provider})`);
  }

  return {
    content: choice.message.content,
    model: data.model || config.model,
    provider: config.provider,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  };
}

/**
 * Complete a request with automatic fallback across providers.
 * Tries each configured provider in order; throws if all fail.
 */
export async function complete(request: LLMRequest, userKeys?: { groq?: string; deepseek?: string }): Promise<LLMResponse> {
  const configs = getAvailableConfigs(userKeys);

  if (configs.length === 0) {
    throw new Error(
      "No LLM API keys configured. Please set GROQ_API_KEY or DEEPSEEK_API_KEY in your .env.local file."
    );
  }

  let lastError: Error | null = null;

  for (const config of configs) {
    try {
      return await callLLM(config, request);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `LLM provider ${config.provider} failed: ${lastError.message}. Trying next...`
      );
    }
  }

  throw new Error(
    `All LLM providers failed. Last error: ${lastError?.message}`
  );
}

/**
 * Complete with a specific provider (no fallback).
 */
export async function completeWith(
  provider: "groq" | "deepseek",
  request: LLMRequest,
  userKeys?: { groq?: string; deepseek?: string }
): Promise<LLMResponse> {
  const configs = getAvailableConfigs(userKeys);
  const config = configs.find((c) => c.provider === provider);

  if (!config) {
    throw new Error(
      `Provider ${provider} is not configured. Set the API key in .env.local.`
    );
  }

  return callLLM(config, request);
}
