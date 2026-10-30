import type { AITask } from "./ai-specialists";

export type CloudAIProvider = "groq" | "openrouter";

type ChatCompletionInput = {
  provider: CloudAIProvider;
  endpoint: string;
  apiKey: string;
  model: string;
  task: AITask;
  systemInstruction: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  extraHeaders?: Record<string, string>;
  fetcher?: typeof fetch;
};

export function isFreeOpenRouterModel(model: string): boolean {
  return model === "openrouter/free" || model.endsWith(":free");
}

export function buildChatCompletionPayload(input: Pick<ChatCompletionInput, "model" | "task" | "systemInstruction" | "prompt" | "maxTokens" | "temperature">) {
  return {
    model: input.model,
    messages: [
      { role: "system", content: input.systemInstruction },
      { role: "user", content: input.prompt },
    ],
    max_tokens: input.maxTokens,
    temperature: input.temperature,
    stream: false,
    ...(input.task === "tutor" ? {} : { response_format: { type: "json_object" as const } }),
  };
}

export async function requestChatCompletion(input: ChatCompletionInput): Promise<string> {
  if (input.provider === "openrouter" && !isFreeOpenRouterModel(input.model)) {
    throw new Error("OpenRouter is restricted to free model IDs in StudySpace.");
  }
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher(input.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
      ...(input.extraHeaders ?? {}),
    },
    body: JSON.stringify(buildChatCompletionPayload(input)),
    signal: AbortSignal.timeout(25000),
    cache: "no-store",
  });

  if (!response.ok) {
    // Never include provider response bodies: they may echo prompts or other student data.
    throw new Error(`${input.provider} provider returned HTTP ${response.status}`);
  }

  const payload = await response.json() as {
    choices?: { message?: { content?: string | null } }[];
  };
  const result = payload.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error(`${input.provider} provider returned an empty response.`);
  return result;
}

export async function withProviderFallback<T, P extends string>(
  providers: readonly P[],
  generate: (provider: P) => Promise<T>,
  onFailure?: (provider: P, error: unknown) => void,
): Promise<T> {
  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await generate(provider);
    } catch (error) {
      lastError = error;
      onFailure?.(provider, error);
    }
  }
  throw lastError ?? new Error("No AI providers are configured.");
}

export type GeminiInputPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export function buildGeminiPartsRequest(input: {
  task: AITask;
  systemInstruction: string;
  parts: GeminiInputPart[];
  maxOutputTokens: number;
  temperature: number;
}) {
  return {
    contents: [{ role: "user" as const, parts: input.parts }],
    config: {
      systemInstruction: input.systemInstruction,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
      ...(input.task === "tutor" ? {} : { responseMimeType: "application/json" as const }),
    },
  };
}

export function buildGeminiPdfRequest(input: {
  systemInstruction: string;
  prompt: string;
  pdfBase64: string;
  maxOutputTokens: number;
}) {
  return {
    contents: [
      { inlineData: { mimeType: "application/pdf", data: input.pdfBase64 } },
      { text: input.prompt },
    ],
    config: {
      systemInstruction: input.systemInstruction,
      temperature: 0.2,
      maxOutputTokens: input.maxOutputTokens,
      responseMimeType: "application/json" as const,
    },
  };
}
