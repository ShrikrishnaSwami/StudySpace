import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { generateAIResponse } from "@/lib/gemini";

function createServerSupabase(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function extractJson(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createServerSupabase(token);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your session has expired." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      courseId,
      topic,
      difficulty = "medium",
      questionCount = 10,
    } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "Course is required." },
        { status: 400 }
      );
    }

    const safeQuestionCount = Math.min(
      Math.max(Number(questionCount) || 10, 1),
      30
    );

    const { data: course, error: courseError } =
      await supabase
        .from("courses")
        .select(`
          id,
          code,
          name,
          description,
          professor,
          target_grade
        `)
        .eq("id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (courseError) {
      throw new Error(courseError.message);
    }

    if (!course) {
      return NextResponse.json(
        { error: "Course not found." },
        { status: 404 }
      );
    }

    const { data: notes } = await supabase
      .from("course_notes")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", {
        ascending: false,
      })
      .limit(30);

    const notesText =
      notes
        ?.map((note: Record<string, unknown>, index) => {
          const title =
            String(
              note.title ||
                note.name ||
                `Note ${index + 1}`
            );

          const content =
            String(
              note.content ||
                note.body ||
                note.text ||
                note.description ||
                ""
            );

          return `${title}\n${content}`;
        })
        .join("\n\n") || "No notes available.";

    const prompt = `
Create a university-level practice quiz.

COURSE
${course.code} — ${course.name}

DESCRIPTION
${course.description || "Not provided"}

PROFESSOR
${course.professor || "Not provided"}

TOPIC
${topic || "General course review"}

STUDENT NOTES
${notesText}

DIFFICULTY
${difficulty}

QUESTION COUNT
${safeQuestionCount}

Return ONLY valid JSON.

Required format:

{
  "questions": [
    {
      "question": "Question text",
      "question_type": "multiple_choice",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correct_answer": "Option A",
      "explanation": "Explanation",
      "topic": "Topic",
      "points": 1
    }
  ]
}

Rules:

- Generate exactly ${safeQuestionCount} questions.
- Prefer multiple choice.
- Multiple choice questions must have exactly 4 options.
- correct_answer must exactly match the correct option.
- Use true_false when appropriate.
- Use short_answer sparingly.
- Questions should test understanding and application.
- Do not invent course-specific information unsupported by the notes.
- Make the quiz appropriate for a university student.
`;

    const response = await generateAIResponse({
      systemInstruction: `
You are StudySpace's educational assessment engine.

Generate accurate university-level questions.

Course information and student notes supplied in
the prompt are authoritative for course-specific
content.

Never fabricate course-specific facts.

Return JSON only.
`,
      prompt,
    });

    const parsed = extractJson(response);

    if (!Array.isArray(parsed.questions)) {
      throw new Error("Gemini returned an invalid quiz.");
    }

    const questions = parsed.questions
      .slice(0, safeQuestionCount)
      .map(
        (
          question: Record<string, unknown>,
          index: number
        ) => ({
          question: String(
            question.question || ""
          ),

          question_type:
            question.question_type === "true_false"
              ? "true_false"
              : question.question_type ===
                "short_answer"
              ? "short_answer"
              : "multiple_choice",

          options: Array.isArray(question.options)
            ? question.options.map(String)
            : [],

          correct_answer: String(
            question.correct_answer || ""
          ),

          explanation: String(
            question.explanation || ""
          ),

          topic: String(
            question.topic || "General"
          ),

          points:
            Number(question.points) > 0
              ? Number(question.points)
              : 1,

          question_order: index + 1,
        })
      );

    if (questions.length === 0) {
      throw new Error(
        "No questions were generated."
      );
    }

    return NextResponse.json({
      course,
      questions,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate quiz.",
      },
      { status: 500 }
    );
  }
}