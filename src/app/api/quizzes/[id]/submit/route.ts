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

export async function POST(
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

    const { id: quizId } = await context.params;

    const body = await request.json();

    const submittedAnswers =
      body.answers || {};

    const { data: quiz, error: quizError } =
      await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .eq("user_id", user.id)
        .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found." },
        { status: 404 }
      );
    }

    const {
      data: questions,
      error: questionsError,
    } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("question_order", {
        ascending: true,
      });

    if (questionsError) {
      throw new Error(questionsError.message);
    }

    if (!questions?.length) {
      return NextResponse.json(
        { error: "This quiz has no questions." },
        { status: 400 }
      );
    }

    let correctCount = 0;
    let earnedPoints = 0;
    let totalPoints = 0;

    const answerRows = [];

    const results = questions.map((question) => {
      const submitted = String(
        submittedAnswers[question.id] || ""
      ).trim();

      const correct = String(
        question.correct_answer || ""
      ).trim();

      let isCorrect = false;

      if (
        question.question_type === "short_answer"
      ) {
        isCorrect =
          submitted.toLowerCase() ===
          correct.toLowerCase();
      } else {
        isCorrect =
          submitted.toLowerCase() ===
          correct.toLowerCase();
      }

      const points = Number(question.points || 1);

      totalPoints += points;

      if (isCorrect) {
        correctCount++;
        earnedPoints += points;
      }

      return {
        questionId: question.id,
        question: question.question,
        submittedAnswer: submitted,
        correctAnswer: correct,
        isCorrect,
        pointsEarned: isCorrect ? points : 0,
        points,
        explanation: question.explanation || "",
        topic: question.topic || "General",
      };
    });

    const percentage =
      totalPoints > 0
        ? Math.round(
            (earnedPoints / totalPoints) *
              10000
          ) / 100
        : 0;

    const { data: attempt, error: attemptError } =
      await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          score: earnedPoints,
          correct_count: correctCount,
          total_questions: questions.length,
          percentage,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (attemptError) {
      throw new Error(attemptError.message);
    }

    for (const result of results) {
      answerRows.push({
        attempt_id: attempt.id,
        question_id: result.questionId,
        answer: result.submittedAnswer,
        is_correct: result.isCorrect,
        points_earned: result.pointsEarned,
      });
    }

    const { error: answersError } =
      await supabase
        .from("quiz_answers")
        .insert(answerRows);

    if (answersError) {
      throw new Error(answersError.message);
    }

    const topicStats: Record<
      string,
      {
        correct: number;
        total: number;
      }
    > = {};

    for (const result of results) {
      const topic = result.topic || "General";

      if (!topicStats[topic]) {
        topicStats[topic] = {
          correct: 0,
          total: 0,
        };
      }

      topicStats[topic].total++;

      if (result.isCorrect) {
        topicStats[topic].correct++;
      }
    }

    const topics = Object.entries(topicStats)
      .map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
        percentage:
          Math.round(
            (stats.correct / stats.total) *
              100
          ),
      }))
      .sort(
        (a, b) =>
          a.percentage - b.percentage
      );

    return NextResponse.json({
      attempt,
      score: earnedPoints,
      totalPoints,
      correctCount,
      totalQuestions: questions.length,
      percentage,
      results,
      topics,
    });
  } catch (error) {
    console.error(
      "Quiz submission error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit quiz.",
      },
      { status: 500 }
    );
  }
}