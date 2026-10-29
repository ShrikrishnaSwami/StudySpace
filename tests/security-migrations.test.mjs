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
