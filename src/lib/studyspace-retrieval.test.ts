import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { retrieveRelevantStudyContext } from "./studyspace-retrieval.ts";

const evaluation = JSON.parse(
  readFileSync(new URL("./studyspace-retrieval-evaluation.json", import.meta.url), "utf8"),
) as {
  cases: Array<{ id: string; question: string; expectedSections: string[] }>;
};

const separator = "========================";
const context = [
  separator, "STUDENT COURSES", separator,
  "COURSE 1\nCode: COMP 101\nName: Introduction to Computing\nProfessor: Dr. Rivera\nSchedule: Monday at 10 AM",
  separator, "COURSE NOTES", separator,
  "NOTE 1\nTitle: Newton's Second Law\nContent: Newton's second law states that net force equals mass multiplied by acceleration: F = ma.",
  separator, "ASSIGNMENTS", separator,
  "ASSIGNMENT 1\nTitle: Database Project\nDescription: Build a normalized database.\nDue: November 12, 2026\nStatus: In progress",
  separator, "QUIZ ATTEMPTS / PERFORMANCE", separator,
  "ATTEMPT 1\nTitle: Calculus Quiz\nScore: 82 percent\nCorrect: 9\nTotal: 11",
  separator, "CALENDAR", separator,
  "EVENT 1\nTitle: Physics lecture\nDetails: Lecture and evening study session",
].join("\n");

test("evaluation cases retrieve at least one expected section", () => {
  const failures: string[] = [];
  for (const item of evaluation.cases) {
    const result = retrieveRelevantStudyContext(context, item.question);
    const actual = result.sections.map((section) => section.title);
    const matched = item.expectedSections.some((expected) => actual.includes(expected));
    if (!matched) failures.push(item.id + ": expected " + item.expectedSections.join(" or ") + ", got " + actual.join(", "));
  }
  assert.deepEqual(failures, [], failures.join("\n"));
});

test("retrieval returns bounded context and section count", () => {
  const result = retrieveRelevantStudyContext(context, "Tell me about all my courses and assignments", {
    maxSections: 2,
    maxCharacters: 1000,
  });
  assert.ok(result.sections.length <= 2);
  assert.ok(result.context.length <= 1000);
  assert.equal(result.strategy, "lexical-v1");
});

test("empty context returns a safe, explicit result", () => {
  const result = retrieveRelevantStudyContext("", "What is my next assignment?");
  assert.equal(result.sections.length, 0);
  assert.match(result.context, /No StudySpace context is available/);
});

test("unmatched questions fall back to a small overview", () => {
  const result = retrieveRelevantStudyContext(context, "What should I focus on today?");
  assert.ok(result.sections.length > 0);
  assert.ok(result.sections.length <= 5);
});
