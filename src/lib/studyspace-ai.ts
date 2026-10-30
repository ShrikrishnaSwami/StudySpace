import "server-only";

import { generateAIResponse, streamAIResponse } from "@/lib/gemini";

export type StudySpaceTask =
  | "tutor"
  | "quiz"
  | "flashcards"
  | "homework"
  | "syllabus"
  | "recommendations";

type GenerateStudySpaceAnswerInput = {
  systemInstruction: string;
  prompt: string;
  task?: StudySpaceTask;
};

/**
 * StudySpace's internal AI orchestration boundary.
 *
 * App features call this interface rather than importing a model vendor
 * directly. It currently delegates to the configured server-side model
 * adapter. A future StudySpace-owned model can implement this boundary
 * without requiring feature routes to be rewritten.
 */
export async function generateStudySpaceAnswer({
  systemInstruction,
  prompt,
  task = "tutor",
}: GenerateStudySpaceAnswerInput): Promise<string> {
  return generateAIResponse({
    systemInstruction,
    prompt,
    task,
  });
}

/** Streaming counterpart used by the AI Tutor chat route. */
export async function* streamStudySpaceAnswer({
  systemInstruction,
  prompt,
  task = "tutor",
}: GenerateStudySpaceAnswerInput): AsyncGenerator<string> {
  yield* streamAIResponse({ systemInstruction, prompt, task });
}
