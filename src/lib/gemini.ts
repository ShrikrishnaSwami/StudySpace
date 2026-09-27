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

export async function generateAIResponse({
  systemInstruction,
  prompt,
}: {
  systemInstruction: string;
  prompt: string;
}) {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model:
      process.env.GEMINI_MODEL ||
      "gemini-3.8-flash",

    contents: prompt,

    config: {
      systemInstruction,
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return text;
}