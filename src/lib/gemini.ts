import "server-only";

import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing from the server environment."
    );
  }

  if (!client) {
    client = new GoogleGenAI({
      apiKey,
    });
  }

  return client;
}

function isRetryableError(error: unknown) {
  const text =
    error instanceof Error
      ? error.message
      : JSON.stringify(error);

  return (
    text.includes("503") ||
    text.includes("UNAVAILABLE") ||
    text.includes("429") ||
    text.includes("RESOURCE_EXHAUSTED") ||
    text.includes("overloaded") ||
    text.includes("high demand")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function generateWithModel({
  model,
  systemInstruction,
  prompt,
}: {
  model: string;
  systemInstruction: string;
  prompt: string;
}) {
  const ai = getGeminiClient();

  const response =
    await ai.models.generateContent({
      model,

      contents: prompt,

      config: {
        systemInstruction,

        temperature: 0.4,

        maxOutputTokens: 4096,
      },
    });

  const text =
    response.text?.trim();

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return text;
}

export async function generateAIResponse({
  systemInstruction,
  prompt,
}: {
  systemInstruction: string;
  prompt: string;
}) {
  const primaryModel =
    process.env.GEMINI_MODEL ||
    "gemini-3.8-flash";

  const fallbackModel =
    process.env.GEMINI_FALLBACK_MODEL ||
    "gemini-3.5-flash-lite";

  /*
   * Try the primary model first.
   *
   * We give it two attempts because temporary 503s
   * are often resolved within a few seconds.
   */

  try {
    return await generateWithModel({
      model: primaryModel,
      systemInstruction,
      prompt,
    });
  } catch (firstError) {
    console.error(
      `Gemini primary model failed (${primaryModel}):`,
      firstError
    );

    /*
     * Only retry temporary capacity/rate-limit
     * errors. Don't hide genuine configuration
     * or programming errors.
     */

    if (!isRetryableError(firstError)) {
      throw firstError;
    }
  }

  /*
   * Short delay before retrying.
   */

  await sleep(1200);

  try {
    return await generateWithModel({
      model: primaryModel,
      systemInstruction,
      prompt,
    });
  } catch (secondError) {
    console.error(
      `Gemini primary retry failed (${primaryModel}):`,
      secondError
    );

    if (!isRetryableError(secondError)) {
      throw secondError;
    }
  }

  /*
   * Primary model is unavailable.
   *
   * Switch to a lightweight fallback model.
   */

  console.log(
    `Falling back from ${primaryModel} to ${fallbackModel}`
  );

  await sleep(500);

  try {
    return await generateWithModel({
      model: fallbackModel,
      systemInstruction,
      prompt,
    });
  } catch (fallbackError) {
    console.error(
      `Gemini fallback model failed (${fallbackModel}):`,
      fallbackError
    );

    throw new Error(
      "Gemini is temporarily unavailable. Please try again in a moment."
    );
  }
}