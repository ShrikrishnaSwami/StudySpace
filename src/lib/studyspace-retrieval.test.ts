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
].join("\n").replace(/^/, "\n");

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

test("query expansion retrieves relevant sections when wording differs", () => {
  const cases = [
    { question: "Who teaches COMP 101 and when do I attend?", expected: "STUDENT COURSES" },
    { question: "What coursework must I finish and by what date?", expected: "ASSIGNMENTS" },
    { question: "How did I perform on my calculus assessment?", expected: "QUIZ ATTEMPTS / PERFORMANCE" },
    { question: "What study events are coming up?", expected: "CALENDAR" },
  ];
  for (const item of cases) {
    const result = retrieveRelevantStudyContext(context, item.question);
    assert.ok(
      result.sections.some((section) => section.title === item.expected),
      `Expected "${item.expected}" for question "${item.question}", got ${result.sections.map((section) => section.title).join(", ")}`,
    );
  }
});

test("retrieval selects an individual matching note instead of the entire notes category", () => {
  const multiNoteContext = [
    separator, "COURSE NOTES", separator,
    "NOTE 1\nTitle:\nNewton's Second Law\nContent:\nNet force equals mass multiplied by acceleration.",
    "NOTE 2\nTitle:\nPhotosynthesis\nContent:\nPlants convert light energy into chemical energy.",
  ].join("\n").replace(/^/, "\n");
  const result = retrieveRelevantStudyContext(multiNoteContext, "Explain photosynthesis from my notes");
  assert.equal(result.sections[0]?.title, "COURSE NOTES");
  assert.match(result.sections[0]?.source || "", /Photosynthesis/i);
  assert.match(result.context, /Plants convert light energy/);
  assert.doesNotMatch(result.context, /Net force equals mass/);
});

test("semantic scores can retrieve a paraphrased note without keyword overlap", () => {
  const multiNoteContext = [
    separator, "COURSE NOTES", separator,
    "NOTE 1\nTitle:\nNewton's Second Law\nContent:\nNet force equals mass multiplied by acceleration.",
    "NOTE 2\nTitle:\nPhotosynthesis\nContent:\nPlants convert light energy into chemical energy.",
  ].join("\n").replace(/^/, "\n");
  const result = retrieveRelevantStudyContext(multiNoteContext, "How do plants make food from sunlight?", {
    semanticScores: {
      "COURSE NOTES::NOTE 1: Newton's Second Law": 0.12,
      "COURSE NOTES::NOTE 2: Photosynthesis": 0.82,
    },
  });

  assert.equal(result.strategy, "record-hybrid-semantic-v1");
  assert.equal(result.sections[0]?.source, "NOTE 2: Photosynthesis");
  assert.match(result.context, /Plants convert light energy into chemical energy/);
  assert.doesNotMatch(result.context, /Net force equals mass/);
});

test("category-only questions use a small overview rather than unrelated lexical matches", () => {
  const result = retrieveRelevantStudyContext(context, "Show me my notes");
  assert.ok(result.sections.length > 0);
  assert.ok(result.sections.length <= 5);
  assert.ok(result.sections.every((section) => section.title === "COURSE NOTES" || section.title === "STUDENT COURSES" || section.title === "ASSIGNMENTS" || section.title === "CALENDAR" || section.title === "QUIZ ATTEMPTS / PERFORMANCE" || section.title === "HOMEWORK"));
});

test("long notes are chunked and retrieve the relevant later section", () => {
  const filler = "General orbital mechanics background explains reference frames and motion.\n".repeat(120);
  const longContext = [
    separator, "COURSE NOTES", separator,
    "NOTE 1\nTitle:\nCelestial Mechanics\nContent:\n" +
      filler +
      "Lagrange points are locations where gravitational and orbital effects can balance. " +
      "The L4 and L5 points can be stable in suitable systems.",
  ].join("\n").replace(/^/, "\n");

  const result = retrieveRelevantStudyContext(longContext, "Explain Lagrange points from my notes");
  assert.equal(result.sections.length, 1);
  assert.match(result.sections[0]?.source || "", /\(part \d+\)/);
  assert.match(result.context, /Lagrange points are locations/);
  assert.match(result.context, /L4 and L5 points can be stable/);
});

test("retrieval returns bounded context and section count", () => {
  const result = retrieveRelevantStudyContext(context, "Tell me about all my courses and assignments", {
    maxSections: 2,
    maxCharacters: 1000,
  });
  assert.ok(result.sections.length <= 2);
  assert.ok(result.context.length <= 1000);
  assert.equal(result.strategy, "record-lexical-expanded-v3");
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
