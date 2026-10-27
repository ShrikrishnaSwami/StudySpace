import "server-only";

import { GoogleGenAI } from "@google/genai";

type AITask = "tutor" | "quiz" | "flashcards" | "homework" | "syllabus" | "recommendations";

let client: GoogleGenAI | null = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("The AI provider is not configured on the server.");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

function isRetryableError(error: unknown) {
  const value = error instanceof Error ? error.message : String(error);
  return /\b(429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|timeout|temporarily unavailable/i.test(value);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function configuredModels(task: AITask) {
  const defaultModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const fastModel = process.env.GEMINI_FAST_MODEL || process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
  const reasoningModel = process.env.GEMINI_REASONING_MODEL || defaultModel;
  const taskModel: Record<AITask, string> = {
    tutor: process.env.GEMINI_TUTOR_MODEL || defaultModel,
    quiz: reasoningModel,
    homework: reasoningModel,
    syllabus: reasoningModel,
    flashcards: fastModel,
    recommendations: fastModel,
  };
  const fallback = process.env.GEMINI_FALLBACK_MODEL || fastModel;
  return { primary: taskModel[task], fallback };
}

const taskGuidance: Record<AITask, string> = {
  tutor: [
    "Teach for understanding, not just answer delivery.",
    "Start by identifying the student's actual question and likely knowledge gap.",
    "Explain difficult ideas in ordered, manageable steps; define unfamiliar terms and use a concrete example when useful.",
    "For calculations, show the governing equation, substitutions, units, intermediate steps, and a quick reasonableness check.",
    "For code, explain the bug or idea before presenting a focused working example.",
    "Never pretend to have accessed a file, website, course, grade, or deadline that is not in the supplied context.",
    "If context is missing or uncertain, say so and ask one focused clarification instead of inventing facts.",
    "If the student asks for an answer to assessed work, support learning with reasoning and examples rather than claiming certainty about instructor expectations.",
  ].join("\n"),
  quiz: "Generate academically accurate, unambiguous questions. Ensure each answer is supported by the supplied material, options are distinct, and the answer key matches the question. Return only the requested structured format.",
  flashcards: "Create concise active-recall cards. Each front should test one idea; each back should give a correct, self-contained answer with a short explanation where useful. Avoid duplicate cards and unsupported claims. Return only the requested structured format.",
  homework: "Give constructive, specific feedback grounded in the provided assignment and student work. Separate observed evidence from suggestions, never invent a rubric criterion, and explain the next actionable revision.",
  syllabus: "Extract only details supported by the supplied syllabus. Never invent dates, assessment weights, deadlines, or instructor details. Mark ambiguous dates as uncertain and return only the requested structured format.",
  recommendations: "Use only the supplied student data for personalized claims. Prioritize a small number of concrete, achievable actions, explain the reason and estimated effort, and never fabricate grades, deadlines, or courses. Return only the requested structured format.",
};

async function generateWithModel({
  model,
  systemInstruction,
  prompt,
  task,
}: {
  model: string;
  systemInstruction: string;
  prompt: string;
  task: AITask;
}) {
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: systemInstruction + "\n\nSTUDYSPACE TASK GUIDANCE\n" + taskGuidance[task],
      temperature: task === "tutor" ? 0.35 : 0.2,
      maxOutputTokens: task === "tutor" ? 6144 : 4096,
    },
  });
  const result = response.text?.trim();
  if (!result) throw new Error("The AI provider returned an empty response.");
  return result;
}

export async function generateAIResponse({
  systemInstruction,
  prompt,
  task = "tutor",
}: {
  systemInstruction: string;
  prompt: string;
  task?: AITask;
}) {
  const { primary, fallback } = configuredModels(task);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await generateWithModel({ model: primary, systemInstruction, prompt, task });
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) {
        console.error("AI request failed", { task, model: primary, retryable: false });
        throw new Error("The AI request could not be completed. Please try again.");
      }
      console.warn("AI provider temporarily unavailable", { task, model: primary, attempt: attempt + 1 });
      if (attempt === 0) await wait(700);
    }
  }

  if (fallback !== primary) {
    try {
      return await generateWithModel({ model: fallback, systemInstruction, prompt, task });
    } catch (error) {
      lastError = error;
      console.warn("AI fallback model failed", { task, model: fallback, retryable: isRetryableError(error) });
    }
  }

  // Keep provider responses, prompts, and credentials out of logs and API errors.
  void lastError;
  throw new Error("StudySpace AI is temporarily unavailable. Please try again shortly.");
}
