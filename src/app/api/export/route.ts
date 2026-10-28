import { NextRequest, NextResponse } from "next/server";
import { consumeApiRateLimit } from "@/lib/api-security";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const TABLES = [
  "profiles", "courses", "assignments", "assignment_attachments", "assignment_submissions", "assignment_submission_files", "quizzes", "quiz_questions", "quiz_answers", "ai_tutor_conversations", "ai_tutor_messages",
  "quiz_attempts", "grade_items", "flashcard_decks", "flashcards",
  "calendar_events", "study_sessions", "study_recommendations",
  "notifications", "homework", "course_notes", "course_resources",
  "course_goals", "study_groups", "study_group_members", "study_group_posts",
  "syllabus_imports", "study_plan_items",
] as const;

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ error: "Supabase configuration is missing." }, { status: 503 });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    const rate = await consumeApiRateLimit(user.id, "data-export", 3, 3600, token);
    if (!rate.allowed) return NextResponse.json({ error: "Export limit reached. Please try again later." }, { status: 429 });


    const exported: Record<string, unknown[]> = {};
    const warnings: string[] = [];
    for (const table of TABLES) {
      const { data, error } = await client.from(table).select("*").limit(10000);
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") warnings.push(table + " was unavailable and was skipped.");
        else throw new Error("Data export query failed.");
      } else { exported[table] = data || []; if ((data || []).length === 10000) warnings.push(table + " reached the 10,000-row export cap and may be truncated."); }
    }
    return NextResponse.json({
      format: "studyspace-export-v1",
      exportedAt: new Date().toISOString(),
      user: { id: user.id, email: user.email || null, createdAt: user.created_at },
      data: exported,
      warnings,
    }, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="studyspace-data-export.json"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Could not export your data. Please try again." }, { status: 500 });
  }
}
