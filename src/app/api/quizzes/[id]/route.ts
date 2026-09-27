import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
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
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json(
        { error: "Session expired." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const { data: quiz, error: quizError } =
      await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (quizError) {
      return NextResponse.json(
        { error: quizError.message },
        { status: 404 }
      );
    }

    const { data: questions, error: questionsError } =
      await supabase
        .from("quiz_questions")
        .select(`
          id,
          quiz_id,
          question_order,
          question,
          question_type,
          options,
          explanation,
          topic,
          points
        `)
        .eq("quiz_id", id)
        .order("question_order", {
          ascending: true,
        });

    if (questionsError) {
      throw new Error(questionsError.message);
    }

    return NextResponse.json({
      quiz,
      questions: questions || [],
    });
  } catch (error) {
    console.error("Quiz API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load quiz.",
      },
      { status: 500 }
    );
  }
}