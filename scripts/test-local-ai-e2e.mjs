import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const required = [
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_ANON_KEY",
  "E2E_SUPABASE_SERVICE_ROLE_KEY",
  "E2E_STUDENT_EMAIL",
  "E2E_STUDENT_PASSWORD",
  "E2E_PROJECT_REF",
  "E2E_BASE_URL",
];
for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error("Missing required isolated-test setting: " + name);
}
if (process.env.E2E_ALLOW_MUTATIONS !== "true") {
  throw new Error("Refusing to write test data. Set E2E_ALLOW_MUTATIONS=true only after selecting an isolated Supabase project.");
}

const supabaseUrl = process.env.E2E_SUPABASE_URL.trim();
const projectRef = process.env.E2E_PROJECT_REF.trim();
const baseUrl = new URL(process.env.E2E_BASE_URL.trim());
const parsedSupabaseUrl = new URL(supabaseUrl);
const PRODUCTION_PROJECT_REF = "sorawzmwqmkwezipmzwx";

assert(
  ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname),
  "This suite only runs against a local StudySpace server (localhost / 127.0.0.1).",
);
assert.notEqual(projectRef, PRODUCTION_PROJECT_REF, "The production StudySpace Supabase project is blocked.");
assert(!supabaseUrl.includes(PRODUCTION_PROJECT_REF), "Production Supabase URL is blocked.");
if (parsedSupabaseUrl.hostname.endsWith(".supabase.co")) {
  assert.equal(parsedSupabaseUrl.hostname.split(".")[0], projectRef, "E2E_PROJECT_REF must match the isolated Supabase project URL.");
}
assert(
  projectRef === "local" || projectRef.startsWith("e2e-") || projectRef.startsWith("test-") || projectRef !== PRODUCTION_PROJECT_REF,
  "Use an explicitly isolated Supabase project reference.",
);

const admin = createClient(supabaseUrl, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const student = createClient(supabaseUrl, process.env.E2E_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const runId = randomUUID();
const marker = "SS-E2E-" + runId.slice(0, 8);
const base = baseUrl.origin;
const created = {
  courseId: null,
  noteIds: [],
  resourceIds: [],
  conversationId: null,
  assignmentId: null,
  submissionId: null,
  referencePaths: [],
  submissionPaths: [],
  recommendationIds: [],
  notificationIds: [],
};
const checks = [];

function record(name, detail) {
  checks.push({ name, detail });
  process.stdout.write("PASS  " + name + (detail ? " — " + detail : "") + "\n");
}

function pdfBuffer(lines) {
  const escapePdf = (value) => value.replace(/[^\x20-\x7e]/g, " ").replace(/([\\()])/g, "\\$1");
  const commands = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"];
  for (const line of lines) commands.push("(" + escapePdf(line) + ") Tj", "T*");
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + Buffer.byteLength(stream, "ascii") + " >>\nstream\n" + stream + "\nendstream",
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(output, "ascii"));
    output += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xrefOffset = Buffer.byteLength(output, "ascii");
  output += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) output += String(offset).padStart(10, "0") + " 00000 n \n";
  output += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  return Buffer.from(output, "ascii");
}

async function checked(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(label + ": " + error.message);
  return data;
}

async function api(path, token, body, options = {}) {
  const headers = { authorization: "Bearer " + token, ...(options.headers || {}) };
  const response = await fetch(base + path, {
    method: options.method || "POST",
    headers,
    body: options.form || (body === undefined ? undefined : JSON.stringify(body)),
    signal: AbortSignal.timeout(options.timeout || 150000),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  assert(response.ok, path + " returned HTTP " + response.status + ": " + (typeof data === "string" ? data.slice(0, 800) : JSON.stringify(data).slice(0, 1200)));
  return data;
}

async function cleanup() {
  const warnings = [];
  const remove = async (label, promise) => {
    try {
      const { error } = await promise;
      if (error) warnings.push(label + ": " + error.message);
    } catch (error) {
      warnings.push(label + ": " + String(error));
    }
  };
  if (created.notificationIds.length) {
    await remove("notifications", admin.from("notifications").delete().in("id", created.notificationIds));
  }
  if (created.recommendationIds.length) {
    await remove("study recommendations", admin.from("study_recommendations").delete().in("id", created.recommendationIds));
  }
  if (created.submissionId) {
    await remove("submission file rows", admin.from("assignment_submission_files").delete().eq("submission_id", created.submissionId));
  }
  if (created.assignmentId) {
    await remove("assignment attachment rows", admin.from("assignment_attachments").delete().eq("assignment_id", created.assignmentId));
  }
  if (created.conversationId) {
    await remove("tutor conversation", admin.from("ai_tutor_conversations").delete().eq("id", created.conversationId));
  }
  if (created.submissionId) {
    await remove("synthetic submission", admin.from("assignment_submissions").delete().eq("id", created.submissionId));
  }
  if (created.assignmentId) {
    await remove("synthetic assignment", admin.from("assignments").delete().eq("id", created.assignmentId));
  }
  if (created.noteIds.length) {
    await remove("synthetic notes", admin.from("course_notes").delete().in("id", created.noteIds));
  }
  if (created.resourceIds.length) {
    await remove("synthetic resources", admin.from("course_resources").delete().in("id", created.resourceIds));
  }
  if (created.courseId) {
    await remove("synthetic course", admin.from("courses").delete().eq("id", created.courseId));
  }
  if (created.referencePaths.length) {
    await remove("assignment reference PDFs", admin.storage.from("assignment-files").remove(created.referencePaths));
  }
  if (created.submissionPaths.length) {
    await remove("student submission PDFs", admin.storage.from("assignment-submissions").remove(created.submissionPaths));
  }
  return warnings;
}

let token;
let userId;
let cleanupWarnings = [];
let failed = false;

try {
  const health = await fetch(base + "/api/admin/stats", { signal: AbortSignal.timeout(10000) });
  assert.notEqual(health.status, 404, "Local StudySpace server did not expose the expected API.");
  record("Local application reachable", base);

  const { data: authData, error: authError } = await student.auth.signInWithPassword({
    email: process.env.E2E_STUDENT_EMAIL,
    password: process.env.E2E_STUDENT_PASSWORD,
  });
  if (authError || !authData.session || !authData.user) {
    throw new Error("Could not sign in the dedicated E2E student: " + (authError?.message || "No session returned."));
  }
  token = authData.session.access_token;
  userId = authData.user.id;
  record("Dedicated isolated student authenticated", userId);

  const course = await checked(admin.from("courses").insert({
    user_id: userId,
    code: marker,
    name: "Synthetic AI Integration Lab",
    description: "Isolated E2E course. Source marker: " + marker + ". Study cellular respiration, ATP synthase, photosynthesis, and chlorophyll.",
    professor: "Synthetic Test Fixture",
    semester: "E2E",
    target_grade: 90,
  }).select("id").single(), "Create synthetic course");
  created.courseId = course.id;

  const seededNote = await checked(admin.from("course_notes").insert({
    user_id: userId,
    course_id: course.id,
    title: marker + " — Cellular respiration lecture",
    content: "MITOCHONDRIA SOURCE MATERIAL " + marker + ". The electron transport chain is embedded in the inner mitochondrial membrane. It pumps protons into the intermembrane space. ATP synthase allows protons to flow back into the matrix and uses that energy to synthesize ATP from ADP and inorganic phosphate. Oxygen is the terminal electron acceptor and water is formed. Photosynthesis occurs in chloroplasts; chlorophyll absorbs light energy.",
    unit_name: "Synthetic Unit 1",
    category: "Lecture notes",
  }).select("id").single(), "Create synthetic course note");
  created.noteIds.push(seededNote.id);

  const resource = await checked(admin.from("course_resources").insert({
    user_id: userId,
    course_id: course.id,
    title: marker + " — ATP synthase resource",
    description: "Synthetic source: chemiosmosis couples the proton gradient across the inner mitochondrial membrane to ATP synthesis.",
    resource_type: "link",
    url: "https://example.invalid/" + runId,
    unit_name: "Synthetic Unit 1",
    category: "Reading",
  }).select("id").single(), "Create synthetic course resource");
  created.resourceIds.push(resource.id);

  const conversation = await checked(admin.from("ai_tutor_conversations").insert({
    user_id: userId,
    course_id: course.id,
    title: marker + " — Tutor verification",
  }).select("id").single(), "Create synthetic tutor conversation");
  created.conversationId = conversation.id;

  const dueDate = new Date(Date.now() + 2 * 86400000).toISOString();
  const assignment = await checked(admin.from("assignments").insert({
    user_id: userId,
    course_id: course.id,
    title: marker + " — Explain chemiosmosis",
    description: "Explain how the proton gradient drives ATP synthesis.",
    due_date: dueDate,
    priority: "high",
    status: "pending",
    progress: 0,
    points: 20,
    max_points: 20,
    assignment_questions: "Explain the electron transport chain, proton gradient, ATP synthase, and oxygen's role.",
    rubric_text: "Scientific accuracy 8 points; causal explanation 6 points; terminology 4 points; clarity 2 points.",
    unit_name: "Synthetic Unit 1",
  }).select("id").single(), "Create synthetic assignment");
  created.assignmentId = assignment.id;

  const rubricPdf = pdfBuffer([
    marker + " RUBRIC",
    "Synthetic rubric for the chemiosmosis assignment.",
    "Scientific accuracy: 8 points.",
    "Causal explanation of proton gradient and ATP synthase: 6 points.",
    "Correct terminology: 4 points.",
    "Clarity: 2 points.",
    "Maximum score: 20 points.",
  ]);
  const promptPdf = pdfBuffer([
    marker + " ASSIGNMENT PROMPT",
    "Explain how the electron transport chain creates a proton gradient.",
    "Explain how ATP synthase uses proton flow to produce ATP.",
    "Explain why oxygen is needed as the terminal electron acceptor.",
  ]);
  const rubricPath = userId + "/" + assignment.id + "/" + runId + "-rubric.pdf";
  const promptPath = userId + "/" + assignment.id + "/" + runId + "-prompt.pdf";
  for (const [path, bytes, name, kind] of [
    [rubricPath, rubricPdf, "synthetic-rubric.pdf", "rubric"],
    [promptPath, promptPdf, "synthetic-prompt.pdf", "instructions"],
  ]) {
    const { error } = await admin.storage.from("assignment-files").upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (error) throw new Error("Upload " + kind + " PDF: " + error.message);
    created.referencePaths.push(path);
    await checked(admin.from("assignment_attachments").insert({
      assignment_id: assignment.id,
      user_id: userId,
      file_name: name,
      storage_path: path,
      file_type: "application/pdf",
      file_size: bytes.length,
      attachment_kind: kind,
    }), "Register " + kind + " PDF");
  }
  record("Synthetic course, source notes, assignment prompt and rubric PDFs created", "All records use a unique " + marker + " marker.");

  const notesPdf = pdfBuffer([
    marker + " PHOTOSYNTHESIS HANDOUT",
    "Photosynthesis converts light energy into chemical energy in chloroplasts.",
    "Chlorophyll in the thylakoid membranes absorbs light.",
    "The light-dependent reactions split water, release oxygen, and produce ATP and NADPH.",
    "The Calvin cycle uses ATP and NADPH to fix carbon dioxide into carbohydrates.",
    "The two stages are linked because products of the light reactions power carbon fixation.",
  ]);
  const noteForm = new FormData();
  noteForm.set("courseId", course.id);
  noteForm.set("unitName", "Synthetic Unit 2");
  noteForm.set("category", "Lecture notes");
  noteForm.set("file", new Blob([notesPdf], { type: "application/pdf" }), marker + "-photosynthesis.pdf");
  const noteResult = await api("/api/ai/notes", token, undefined, { form: noteForm });
  assert(noteResult.note?.id, "Research specialist did not save an extracted note.");
  created.noteIds.push(noteResult.note.id);
  const extracted = await checked(admin.from("course_notes").select("title,content").eq("id", noteResult.note.id).single(), "Read extracted synthetic note");
  assert(extracted.content.length >= 40, "Extracted PDF notes are unexpectedly short.");
  assert(/photosynth|chlorophyll|thylakoid|calvin/i.test(extracted.content), "Extracted notes do not reflect the uploaded PDF.");
  record("Research specialist — PDF note extraction", extracted.title);

  const tutorResponse = await fetch(base + "/api/ai/tutor", {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({
      courseId: course.id,
      conversationId: conversation.id,
      message: "Using my course notes, explain how the proton gradient powers ATP synthase. Mention the inner mitochondrial membrane and oxygen.",
    }),
    signal: AbortSignal.timeout(150000),
  });
  assert(tutorResponse.ok, "Tutor specialist returned HTTP " + tutorResponse.status);
  const tutorText = await tutorResponse.text();
  const tutorEvents = tutorText.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const tutorAnswer = tutorEvents.filter((event) => event.type === "chunk").map((event) => event.text || "").join("");
  assert(tutorAnswer.length > 80, "Tutor specialist returned too little explanatory content.");
  assert(tutorEvents.some((event) => event.type === "done"), "Tutor stream did not finish cleanly.");
  assert(/ATP|proton|mitochond/i.test(tutorAnswer), "Tutor response does not address the synthetic course topic.");
  record("Tutor specialist — course-grounded streaming explanation", tutorAnswer.slice(0, 180).replace(/\s+/g, " "));

  const quiz = await api("/api/ai/quiz", token, {
    courseId: course.id,
    topic: "Chemiosmosis, ATP synthase and cellular respiration",
    difficulty: "medium",
    questionCount: 4,
  });
  assert(Array.isArray(quiz.questions) && quiz.questions.length > 0, "Assessment specialist returned no validated quiz questions.");
  for (const question of quiz.questions) {
    assert(typeof question.question === "string" && question.question.length > 10, "Quiz question is missing.");
    assert(typeof question.correct_answer === "string" && question.correct_answer.length > 0, "Quiz answer key is missing.");
  }
  record("Assessment specialist — course-grounded quiz", quiz.questions.length + " validated questions.");

  const flashcards = await api("/api/ai/flashcards", token, {
    courseId: course.id,
    topic: "Chemiosmosis and ATP synthase",
    count: 5,
  });
  assert(Array.isArray(flashcards.cards) && flashcards.cards.length >= 3, "Memory specialist returned fewer than three valid cards.");
  for (const card of flashcards.cards) {
    assert(card.front?.trim() && card.back?.trim(), "A flashcard is missing its front or back.");
  }
  record("Memory specialist — course-grounded flashcards", flashcards.cards.length + " valid cards.");

  const recommendations = await api("/api/ai/recommendations", token, {});
  assert(Array.isArray(recommendations.recommendations) && recommendations.recommendations.length >= 1, "Planner specialist returned no recommendations.");
  for (const item of recommendations.recommendations) {
    assert(typeof item.title === "string" && item.title.trim(), "A recommendation is missing its title.");
    assert(typeof item.recommendation === "string" && item.recommendation.trim(), "A recommendation is missing its action.");
    assert(["low", "medium", "high", "urgent"].includes(item.priority), "A recommendation has an invalid priority.");
    if (item.course_id) assert.equal(item.course_id, course.id, "Planner linked a recommendation to a non-test course.");
    if (item.id) created.recommendationIds.push(item.id);
  }
  record("Planner specialist — persisted, validated recommendations", recommendations.recommendations.length + " recommendations.");

  const submission = await checked(admin.from("assignment_submissions").insert({
    assignment_id: assignment.id,
    user_id: userId,
    attempt_number: 1,
    status: "submitted",
    submission_note: "Synthetic answer: The electron transport chain pumps protons across the inner mitochondrial membrane. Protons return through ATP synthase, driving ATP production from ADP and phosphate. Oxygen accepts electrons at the end of the chain and combines with protons to form water.",
    submitted_at: new Date().toISOString(),
  }).select("id").single(), "Create synthetic submitted answer");
  created.submissionId = submission.id;

  const answerPdf = pdfBuffer([
    marker + " STUDENT ANSWER",
    "The electron transport chain uses energy from electron transfer to pump protons from the matrix into the intermembrane space.",
    "This creates an electrochemical gradient across the inner mitochondrial membrane.",
    "Protons move back into the matrix through ATP synthase, which couples this flow to ADP plus phosphate forming ATP.",
    "Oxygen is the final electron acceptor and combines with electrons and protons to form water.",
  ]);
  const answerPath = userId + "/" + assignment.id + "/" + submission.id + "/" + runId + "-answer.pdf";
  const { error: answerUploadError } = await admin.storage.from("assignment-submissions").upload(answerPath, answerPdf, { contentType: "application/pdf", upsert: false });
  if (answerUploadError) throw new Error("Upload synthetic student PDF: " + answerUploadError.message);
  created.submissionPaths.push(answerPath);
  await checked(admin.from("assignment_submission_files").insert({
    submission_id: submission.id,
    user_id: userId,
    file_name: "synthetic-answer.pdf",
    storage_path: answerPath,
    file_type: "application/pdf",
    file_size: answerPdf.length,
  }), "Register synthetic student PDF");

  const grade = await api("/api/assignments/grade", token, {
    assignmentId: assignment.id,
    submissionId: submission.id,
  });
  assert(Number.isFinite(Number(grade.grade)), "Grading specialist did not return a numeric score.");
  assert(Number(grade.grade) >= 0 && Number(grade.grade) <= 20, "AI grade is outside the 0–20 range.");
  assert(typeof grade.feedback === "string" && grade.feedback.length >= 40, "AI grader returned insufficient feedback.");
  assert(/strength|improv|criteria|accuracy|ATP|proton/i.test(grade.feedback), "AI feedback does not include actionable rubric-related detail.");
  const persistedGrade = await checked(admin.from("assignment_submissions").select("ai_grade,ai_feedback,grade,feedback").eq("id", submission.id).single(), "Verify persisted AI grade");
  assert.equal(Number(persistedGrade.ai_grade), Number(grade.grade), "Persisted AI score differs from the API response.");
  assert(persistedGrade.ai_feedback?.length >= 40, "AI feedback was not persisted.");
  assert(persistedGrade.grade === null, "AI grading unexpectedly overwrote the human grade field.");
  record("Assessment specialist — PDF + rubric grading", persistedGrade.ai_grade + "/20; persisted AI feedback verified.");

  const recommendationsRows = await checked(admin.from("study_recommendations").select("id").eq("user_id", userId).like("title", marker + "%"), "Find generated synthetic recommendations");
  created.recommendationIds = [...new Set([...created.recommendationIds, ...(recommendationsRows || []).map((row) => row.id)])];
  const notifications = await checked(admin.from("notifications").select("id,metadata").eq("user_id", userId), "Find synthetic recommendation notifications");
  created.notificationIds = (notifications || []).filter((row) =>
    created.recommendationIds.includes(row.metadata?.recommendation_id),
  ).map((row) => row.id);

  record("All five specialist profiles invoked", "Tutor, Research, Assessment, Memory and Planner; Assessment also graded a PDF submission.");
} catch (error) {
  failed = true;
  console.error("\nFAIL  " + (error instanceof Error ? error.stack || error.message : String(error)));
} finally {
  cleanupWarnings = await cleanup();
  if (cleanupWarnings.length) {
    console.error("\nCLEANUP WARNINGS\n" + cleanupWarnings.map((warning) => " - " + warning).join("\n"));
    failed = true;
  } else if (created.courseId) {
    record("Synthetic data cleanup", "Removed test course, notes, resources, assignment, PDFs, submission, tutor thread and recommendations.");
  }
  if (token) {
    try { await student.auth.signOut(); } catch { /* test-only session cleanup */ }
  }
}

process.stdout.write("\nLocal AI E2E summary: " + checks.length + " checks passed.\n");
if (failed) process.exitCode = 1;
