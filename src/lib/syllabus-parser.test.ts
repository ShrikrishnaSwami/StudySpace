import assert from "node:assert/strict";
import test from "node:test";
import { isValidIsoDate, parseSyllabusAiJson } from "./syllabus-parser.ts";

test("parses JSON returned inside markdown fences", () => {
  assert.deepEqual(parseSyllabusAiJson('\x60\x60\x60json\n{"events":[{"title":"Midterm","date":"2026-11-12"}]}\n\x60\x60\x60'), {
    events: [{ title: "Midterm", date: "2026-11-12" }],
  });
});

test("recovers a complete JSON object surrounded by provider prose", () => {
  assert.deepEqual(parseSyllabusAiJson('Here are the dates:\n{"events":[{"title":"Essay {draft} due","date":"2026-11-12"}]}\nDone.'), {
    events: [{ title: "Essay {draft} due", date: "2026-11-12" }],
  });
});

test("rejects malformed or non-object responses", () => {
  assert.throws(() => parseSyllabusAiJson("not JSON"), /valid JSON object/);
  assert.throws(() => parseSyllabusAiJson('[{"title":"Midterm"}]'), /valid JSON object/);
});

test("accepts real calendar dates and leap days", () => {
  assert.equal(isValidIsoDate("2024-02-29"), true);
  assert.equal(isValidIsoDate("2026-10-28"), true);
});

test("rejects impossible dates instead of allowing JavaScript rollover", () => {
  assert.equal(isValidIsoDate("2026-02-29"), false);
  assert.equal(isValidIsoDate("2026-02-31"), false);
  assert.equal(isValidIsoDate("2026-13-01"), false);
  assert.equal(isValidIsoDate("not-a-date"), false);
  assert.equal(isValidIsoDate(""), false);
});
