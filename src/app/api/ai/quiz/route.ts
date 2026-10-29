import { NextRequest, NextResponse } from "next/server";
import { consumeAiQuota } from "@/lib/api-security";
import { createClient } from "@supabase/supabase-js";

import { generateAIResponse } from "@/lib/gemini";

function createServerSupabase(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

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

    if (Number(request.headers.get("content-length") || 0) > 32768) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const {
      courseId,
      topic: rawTopic,
      difficulty: rawDifficulty = "medium",
      questionCount = 10,
    } = body;

    if (typeof courseId !== "string" || !courseId.trim()) {
      return NextResponse.json(
        { error: "Course is required." },
        { status: 400 }
      );
    }

    const safeQuestionCount = Math.min(
      Math.max(Number(questionCount) || 10, 1),
      30
    );
    const topic = typeof rawTopic === "string" ? rawTopic.trim().slice(0, 300) : "";
    const difficulty = ["easy", "medium", "hard"].includes(String(rawDifficulty).toLowerCase())
      ? String(rawDifficulty).toLowerCase()
      : "medium";

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

    const quota = await consumeAiQuota(token, "quiz");
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.scope === "rate" ? "Too many AI requests. Please wait a few minutes and try again." : quota.scope === "global" ? "StudySpace AI has reached its shared beta capacity. Please try again later." : "You have reached today's AI quiz limit. Try again after the rolling 24-hour window.", usage: quota }, { status: 429 });
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

          return `${title.slice(0, 200)}\n${content.slice(0, 1400)}`;
        })
        .join("\n\n").slice(0, 20000) || "No notes available.";

    const { data: resources, error: resourcesError } = await supabase
      .from("course_resources")
      .select("title,description,unit_name,category")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (resourcesError) throw resourcesError;
    const resourcesText = (resources || []).map((resource) =>
      "[" + String(resource.unit_name || "General") + " · " + String(resource.category || "Resource") + "] " +
      String(resource.title || "Resource") + "\\n" + String(resource.description || "")
    ).join("\\n\\n").slice(0, 8000);

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

SAVED COURSE RESOURCES (titles and descriptions only; use as additional context, not as evidence of full linked-page contents)
${resourcesText || "No saved resource descriptions."}

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
      task: "quiz",
    });

    const parsed = extractJson(response);

    if (!Array.isArray(parsed.questions)) {
      throw new Error("Gemini returned an invalid quiz.");
    }

    const questions = (parsed.questions as unknown[])
      .slice(0, safeQuestionCount)
      .flatMap((rawQuestion: unknown) => {
        if (!rawQuestion || typeof rawQuestion !== "object" || Array.isArray(rawQuestion)) return [];
        const question = rawQuestion as Record<string, unknown>;
        const text = typeof question.question === "string" ? question.question.trim().slice(0, 2000) : "";
        if (!text) return [];

        const questionType = question.question_type === "true_false"
          ? "true_false"
          : question.question_type === "short_answer"
            ? "short_answer"
            : "multiple_choice";
        let options = Array.isArray(question.options)
          ? question.options.filter((option): option is string => typeof option === "string").map((option) => option.trim().slice(0, 500)).filter(Boolean)
          : [];
        let correctAnswer = typeof question.correct_answer === "string" ? question.correct_answer.trim().slice(0, 1000) : "";

        if (questionType === "multiple_choice") {
          options = [...new Set(options)].slice(0, 4);
          if (options.length !== 4 || !options.some((option) => option.toLowerCase() === correctAnswer.toLowerCase())) return [];
          correctAnswer = options.find((option) => option.toLowerCase() === correctAnswer.toLowerCase()) || correctAnswer;
        } else if (questionType === "true_false") {
          options = ["True", "False"];
          if (/^true$/i.test(correctAnswer)) correctAnswer = "True";
          else if (/^false$/i.test(correctAnswer)) correctAnswer = "False";
          else return [];
        } else if (!correctAnswer) {
          return [];
        }

        const points = Number(question.points);
        return [{
          question: text,
          question_type: questionType,
          options,
          correct_answer: correctAnswer,
          explanation: typeof question.explanation === "string" ? question.explanation.trim().slice(0, 3000) : "",
          topic: typeof question.topic === "string" && question.topic.trim() ? question.topic.trim().slice(0, 120) : "General",
          points: Number.isFinite(points) && points > 0 ? Math.min(100, points) : 1,
        }];
      })
      .map((question, index) => ({ ...question, question_order: index + 1 }));

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "The AI returned questions that could not be validated. Please generate the quiz again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      course,
      questions,
    });
  } catch (error) {
    console.error("Quiz generation request failed:", error instanceof Error ? error.message.slice(0, 240) : "Unknown error");

    return NextResponse.json(
      {
        error: "Failed to generate the quiz. Please try again.",
      },
      { status: 500 }
    );
  }
}