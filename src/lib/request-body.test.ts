import assert from "node:assert/strict";
import test from "node:test";
import { readBoundedFormData, readBoundedJson } from "./request-body.ts";

test("parses bounded JSON", async () => {
  const request = new Request("https://studyspace.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmation: "DELETE" }),
  });
  assert.deepEqual(await readBoundedJson(request, 128), { confirmation: "DELETE" });
});

test("rejects a body that exceeds the limit without Content-Length", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify({ message: "x".repeat(100) })));
      controller.close();
    },
  });
  const request = new Request("https://studyspace.test/api", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  assert.equal(request.headers.has("content-length"), false);
  await assert.rejects(readBoundedJson(request, 32), { message: "REQUEST_TOO_LARGE" });
});

test("rejects declared oversized JSON before reading", async () => {
  const request = new Request("https://studyspace.test/api", {
    method: "POST",
    headers: { "content-length": "500", "content-type": "application/json" },
    body: "x".repeat(500),
  });
  await assert.rejects(readBoundedJson(request, 32), { message: "REQUEST_TOO_LARGE" });
});

test("rejects malformed JSON", async () => {
  const request = new Request("https://studyspace.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  await assert.rejects(readBoundedJson(request, 32), { message: "INVALID_JSON" });
});

test("parses bounded multipart form data", async () => {
  const form = new FormData();
  form.set("courseId", "course-123");
  form.set("unitName", "Week 1");
  const request = new Request("https://studyspace.test/api", { method: "POST", body: form });
  const parsed = await readBoundedFormData(request, 4096);
  assert.equal(parsed.get("courseId"), "course-123");
  assert.equal(parsed.get("unitName"), "Week 1");
});

test("rejects oversized multipart form data", async () => {
  const form = new FormData();
  form.set("payload", "x".repeat(4096));
  const request = new Request("https://studyspace.test/api", { method: "POST", body: form });
  await assert.rejects(readBoundedFormData(request, 128), { message: "REQUEST_TOO_LARGE" });
});
