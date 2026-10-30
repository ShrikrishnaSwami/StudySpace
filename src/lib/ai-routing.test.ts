import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChatCompletionPayload,
  buildGeminiPartsRequest,
  buildGeminiPdfRequest,
  isFreeOpenRouterModel,
  requestChatCompletion,
  withProviderFallback,
} from "./ai-provider-core.ts";
import {
  buildSpecialistInstructions,
  providerEnvKeyForTask,
  resolveProviderForTask,
  specialistForTask,
} from "./ai-specialists.ts";

const base = {
  model: "openai/gpt-oss-20b",
  systemInstruction: "Return JSON only.",
  prompt: "Create three flashcards.",
  maxTokens: 512,
  temperature: 0.2,
};

test("structured cloud tasks request JSON mode", () => {
  const payload = buildChatCompletionPayload({ ...base, task: "flashcards" });
  assert.deepEqual(payload.response_format, { type: "json_object" });
  assert.equal(payload.stream, false);
});

test("tutor conversation remains ordinary text, not JSON mode", () => {
  const payload = buildChatCompletionPayload({ ...base, task: "tutor" });
  assert.equal("response_format" in payload, false);
});

test("Groq request sends JSON mode and parses the assistant content", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const result = await requestChatCompletion({
    provider: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: "test-key",
    task: "quiz",
    ...base,
    fetcher: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"questions":[]}' } }] }), { status: 200 });
    },
  });
  assert.deepEqual(requestBody?.response_format, { type: "json_object" });
  assert.equal(result, '{"questions":[]}');
});

test("a 429 from Groq falls through to the next configured provider", async () => {
  const attempts: string[] = [];
  const result = await withProviderFallback(
    ["groq", "openrouter"] as const,
    (provider) => requestChatCompletion({
      provider,
      endpoint: provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "test-key",
      model: provider === "groq" ? "openai/gpt-oss-20b" : "openrouter/free",
      task: "recommendations",
      systemInstruction: "Return JSON only.",
      prompt: "Recommend a study plan.",
      maxTokens: 512,
      temperature: 0.2,
      fetcher: async (url) => {
        attempts.push(String(url));
        if (provider === "groq") return new Response("rate limited", { status: 429 });
        return new Response(JSON.stringify({ choices: [{ message: { content: '{"recommendations":[]}' } }] }), { status: 200 });
      },
    }),
  );
  assert.equal(attempts.length, 2);
  assert.match(attempts[0], /groq\.com/);
  assert.match(attempts[1], /openrouter\.ai/);
  assert.equal(result, '{"recommendations":[]}');
});

test("provider errors never include response bodies", async () => {
  await assert.rejects(
    requestChatCompletion({
      provider: "groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: "test-key",
      task: "quiz",
      ...base,
      fetcher: async () => new Response("private student prompt echoed here", { status: 503 }),
    }),
    (error: Error) => error.message === "groq provider returned HTTP 503",
  );
});

test("OpenRouter only accepts the free router or explicit free model IDs", () => {
  assert.equal(isFreeOpenRouterModel("openrouter/free"), true);
  assert.equal(isFreeOpenRouterModel("vendor/model:free"), true);
  assert.equal(isFreeOpenRouterModel("vendor/model"), false);
});

test("file-based image/document parts remain on Gemini with JSON response mode", () => {
  const request = buildGeminiPartsRequest({
    task: "homework",
    systemInstruction: "Extract visible evidence only.",
    parts: [
      { inlineData: { mimeType: "image/png", data: "aGVsbG8=" } },
      { text: "Analyse the attached worksheet." },
    ],
    maxOutputTokens: 1024,
    temperature: 0.2,
  });
  const filePart = request.contents[0].parts[0];
  assert.ok("inlineData" in filePart);
  if ("inlineData" in filePart) assert.equal(filePart.inlineData.mimeType, "image/png");
  assert.deepEqual(request.config.responseMimeType, "application/json");
});

test("PDF syllabus path preserves PDF bytes and requests JSON from Gemini", () => {
  const request = buildGeminiPdfRequest({
    systemInstruction: "Extract only explicit dates.",
    prompt: "Read this syllabus.",
    pdfBase64: "JVBERi0xLjQ=",
    maxOutputTokens: 2048,
  });
  assert.deepEqual(request.contents[0].inlineData, { mimeType: "application/pdf", data: "JVBERi0xLjQ=" });
  assert.equal(request.config.responseMimeType, "application/json");
});

test("five specialist workflows have distinct task ownership and provider settings", () => {
  const cases = [
    ["tutor", "Tutor AI", "AI_PROVIDER_TUTOR"],
    ["notes", "Research AI", "AI_PROVIDER_RESEARCH"],
    ["quiz", "Assessment AI", "AI_PROVIDER_ASSESSMENT"],
    ["flashcards", "Memory AI", "AI_PROVIDER_MEMORY"],
    ["recommendations", "Planner AI", "AI_PROVIDER_PLANNER"],
  ] as const;
  for (const [task, name, envKey] of cases) {
    assert.equal(specialistForTask(task).name, name);
    assert.equal(providerEnvKeyForTask(task), envKey);
    assert.match(buildSpecialistInstructions(task), new RegExp(name));
    assert.match(buildSpecialistInstructions(task), /DEDICATED WORKFLOW/);
  }
  const workflows = cases.map(([task]) => buildSpecialistInstructions(task));
  assert.equal(new Set(workflows).size, 5);
});

test("each specialist honors its own provider environment setting", () => {
  const cases = [
    ["tutor", "AI_PROVIDER_TUTOR", "gemini"],
    ["notes", "AI_PROVIDER_RESEARCH", "groq"],
    ["quiz", "AI_PROVIDER_ASSESSMENT", "openrouter"],
    ["flashcards", "AI_PROVIDER_MEMORY", "gemini"],
    ["recommendations", "AI_PROVIDER_PLANNER", "groq"],
  ] as const;
  for (const [task, envKey, provider] of cases) {
    assert.equal(resolveProviderForTask(task, { [envKey]: provider }), provider);
  }
});

test("specialist provider settings override legacy grouped settings", () => {
  assert.equal(resolveProviderForTask("quiz", {
    AI_PROVIDER_ASSESSMENT: "gemini",
    AI_PROVIDER_REASONING: "groq",
  }), "gemini");
});

test("unknown provider values fall back to the specialist default", () => {
  assert.equal(resolveProviderForTask("tutor", { AI_PROVIDER_TUTOR: "unknown" }), "gemini");
  assert.equal(resolveProviderForTask("notes", { AI_PROVIDER_RESEARCH: "unknown" }), "groq");
});
