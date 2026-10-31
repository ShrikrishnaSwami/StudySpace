import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("cross-student admin RLS branches require AAL2", () => {
  const sql = read("supabase/migrations/20261029190000_require_aal2_for_cross_student_admin_rls.sql");
  assert.match(sql, /Read permitted assignment submissions[\s\S]*?aal2/);
  assert.match(sql, /Update permitted assignment submissions[\s\S]*?aal2/);
  assert.match(sql, /Read permitted assignments[\s\S]*?aal2/);
  assert.match(sql, /Read permitted courses[\s\S]*?aal2/);
  assert.match(sql, /Read permitted quizzes[\s\S]*?aal2/);
});

test("assigned students cannot update teacher-owned assignment rows", () => {
  const sql = read("supabase/migrations/20261029190000_require_aal2_for_cross_student_admin_rls.sql");
  const block = sql.match(/create policy "Update permitted assignments"[\s\S]*?;/)?.[0] || "";
  assert.match(block, /using \(user_id = \(select auth\.uid\(\)\)\)/);
  assert.doesNotMatch(block, /assigned_to/);
});

test("student submission identity and grade changes are guarded", () => {
  const sql = read("supabase/migrations/20261029200000_protect_assignment_submission_integrity.sql");
  assert.match(sql, /new\.assignment_id is distinct from old\.assignment_id/);
  assert.match(sql, /new\.grade is distinct from old\.grade/);
  assert.match(sql, /new\.ai_grade is distinct from old\.ai_grade/);
  assert.match(sql, /old\.status = 'submitted'/);
  assert.match(sql, /create trigger protect_assignment_submission_integrity/);
});

test("admin storage reads require AAL2", () => {
  const sql = read("supabase/migrations/20261029210000_require_aal2_for_admin_storage_reads.sql");
  assert.match(sql, /role.*admin/);
  assert.match(sql, /aal.*aal2/);
});

test("admin route is guarded server-side and APIs keep MFA enforcement", () => {
  const layout = read("src/app/admin/layout.tsx");
  const stats = read("src/app/api/admin/stats/route.ts");
  assert.match(layout, /supabase\.auth\.getUser\(\)/);
  assert.match(layout, /app_metadata\?\.role !== "admin"/);
  assert.match(stats, /hasAal2Token/);
});

test("grading request schema rejects unexpected keys and invalid IDs", () => {
  const route = read("src/app/api/assignments/grade/route.ts");
  assert.match(route, /z\.string\(\)\.uuid\(\)/);
  assert.match(route, /\.strict\(\)/);
});

test("Gemini routing catalogs ten models and keeps paid models opt-in", () => {
  const source = read("src/lib/gemini.ts");
  const catalog = source.match(/const GEMINI_MODEL_CATALOG = \[([\s\S]*?)\] as const/)?.[1] || "";
  assert.equal((catalog.match(/\{ id:/g) || []).length, 10);
  assert.match(source, /GEMINI_ALLOW_PAID_MODELS === "true"/);
  assert.match(source, /preferredOrder: Record<AITask, string\[\]>/);
});


test("account deletion recursively paginates, batches, and verifies storage cleanup", () => {
  const cleanup = read("src/lib/account-storage-cleanup.ts");
  const route = read("src/app/api/account/delete/route.ts");
  assert.match(cleanup, /listV2/);
  assert.match(cleanup, /nextCursor/);
  assert.match(cleanup, /index \+= 1000/);
  assert.match(cleanup, /const remaining = await listAllFiles\(\)/);
  assert.match(route, /cleanUserStoragePrefix/);
});

test("all request bodies are parsed through streamed size limits", () => {
  const helper = read("src/lib/request-body.ts");
  assert.match(helper, /request\.body\.getReader\(\)/);
  assert.match(helper, /total > maxBytes/);
  assert.match(helper, /readBoundedFormData/);
  for (const path of [
    "src/app/api/account/delete/route.ts",
    "src/app/api/ai/flashcards/route.ts",
    "src/app/api/ai/homework/route.ts",
    "src/app/api/ai/notes/route.ts",
    "src/app/api/ai/quiz/route.ts",
    "src/app/api/ai/syllabus/route.ts",
    "src/app/api/ai/tutor/route.ts",
    "src/app/api/assignments/grade/route.ts",
    "src/app/api/quizzes/[id]/submit/route.ts",
    "src/app/api/study-groups/join/route.ts",
  ]) {
    const route = read(path);
    assert.match(route, /readBoundedJson|readBoundedFormData/, path);
    assert.doesNotMatch(route, /request\.(?:json|formData)\(\)/, path);
  }
});

test("AI context queries use bounded security-invoker views", () => {
  const context = read("src/lib/ai-context.ts");
  const views = read("supabase/migrations/20261030173726_create_bounded_ai_context_views.sql");
  const courses = read("supabase/migrations/20261030173745_bound_ai_context_courses.sql");
  assert.match(context, /from\("ai_context_course_notes"\)/);
  assert.match(context, /from\("ai_context_courses"\)/);
  assert.match(context, /\.limit\(40\)/);
  assert.match(context, /\.limit\(80\)/);
  assert.match(views, /security_invoker = true/);
  assert.match(views, /left\(content, 2200\)/);
  assert.match(courses, /left\(description, 1000\)/);
});

test("note extraction and assignment grading have independent quotas", () => {
  const quotas = read("supabase/migrations/20261030173502_split_ai_notes_and_grading_quotas.sql");
  const notes = read("src/app/api/ai/notes/route.ts");
  const grading = read("src/app/api/assignments/grade/route.ts");
  const security = read("src/lib/api-security.ts");
  assert.match(quotas, /WHEN 'notes' THEN 15/);
  assert.match(quotas, /WHEN 'grading' THEN 10/);
  assert.match(notes, /consumeAiQuota\(token, "notes"\)/);
  assert.match(grading, /consumeAiQuota\(token, "grading"\)/);
  assert.match(security, /notes: 15/);
  assert.match(security, /grading: 10/);
});

test("admin layout accepts the Supabase publishable key configuration", () => {
  const layout = read("src/app/admin/layout.tsx");
  assert.match(layout, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});

test("main CI runs dependency auditing and avoids duplicate workflow concurrency", () => {
  const workflow = read(".github/workflows/studyspace-ci.yml");
  assert.match(workflow, /npm audit --audit-level=high/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /github\.workflow/);
});


test("bounded context never marks omitted student sources as deleted", () => {
  const semantic = read("src/lib/studyspace-semantic-retrieval.ts");
  const tutor = read("src/app/api/ai/tutor/route.ts");
  assert.match(semantic, /auth\.completeContext === true && allSourceCandidates\.length < 1000/);
  assert.doesNotMatch(tutor, /completeContext:/);
});


test("guest sessions cannot call AI endpoints and signup requires policy consent", () => {
  for (const path of [
    "src/app/api/ai/tutor/route.ts",
    "src/app/api/ai/flashcards/route.ts",
    "src/app/api/ai/quiz/route.ts",
    "src/app/api/ai/recommendations/route.ts",
    "src/app/api/ai/homework/route.ts",
    "src/app/api/ai/notes/route.ts",
    "src/app/api/ai/syllabus/route.ts",
    "src/app/api/assignments/grade/route.ts",
  ]) {
    const route = read(path);
    assert.match(route, /user\.is_anonymous\s*===\s*true/, path);
    assert.match(route, /status:\s*403/, path);
  }

  const signup = read("src/app/signup/page.tsx");
  assert.match(signup, /required checked=\{acceptedTerms\}/);
  assert.match(signup, /disabled=\{loading \|\| !acceptedTerms \|\| \(turnstileEnabled && !captchaToken\)\}/);
  assert.match(signup, /terms_accepted_at/);
  assert.match(signup, /terms_version/);
  assert.match(signup, /privacy_version/);
  assert.match(signup, /signup-website/);
  assert.match(signup, /captchaToken/);
  assert.match(signup, /current\.session\?\.user\.is_anonymous/);
  assert.match(signup, /supabase\.auth\.updateUser/);
  assert.match(signup, /Convert the current guest identity/);

  const login = read("src/app/login/page.tsx");
  assert.match(login, /current\.session\?\.user\.is_anonymous/);
  assert.match(login, /studyspace_guest_refresh_token/);
  assert.match(login, /resumePreviousGuest/);
  assert.match(read("src/components/AppShell.tsx"), /studyspace_guest_refresh_token/);
  assert.match(read("src/app/settings/page.tsx"), /studyspace_guest_refresh_token/);
  assert.match(read("src/components/TurnstileCaptcha.tsx"), /challenges\.cloudflare\.com\/turnstile/);
  assert.match(read("src/lib/security-config.ts"), /0x4AAAAAAFuPioWbZG_4hsC-/);
});
