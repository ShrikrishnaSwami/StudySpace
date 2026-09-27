import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { generateAIResponse } from "@/lib/gemini";
import { getStudentAIContext } from "@/lib/ai-context";
import { formatStudentAIContext } from "@/lib/ai-context-format";

function createSupabaseServerClient(
  token: string
) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are missing."
    );
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
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization?.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "Missing authentication token.",
        },
        { status: 401 }
      );
    }

    const token =
      authorization
        .replace("Bearer ", "")
        .trim();

    const supabase =
      createSupabaseServerClient(token);

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Your session has expired.",
        },
        { status: 401 }
      );
    }

    /*
     * Load everything StudySpace knows
     * about this student's academic workload.
     */

    const context =
      await getStudentAIContext(token);

    const formattedContext =
      formatStudentAIContext(context);

    const prompt = `
Analyze this student's current academic
situation and generate useful study
recommendations.

Use ONLY the supplied student data for
student-specific facts.

Do not invent assignments, deadlines,
grades, quiz scores, courses, or calendar
events.

Prioritize recommendations based on:

1. Urgent or upcoming deadlines
2. Upcoming quizzes/exams
3. Weak quiz performance when available
4. Low course progress
5. Incomplete assignments
6. Important homework
7. Available calendar time
8. Overall workload

Generate between 3 and 6 recommendations.

Each recommendation must contain:

- title
- recommendation
- reason
- priority
- estimated_minutes
- suggested_date
- course_id

Priority must be exactly one of:

low
medium
high
urgent

estimated_minutes should be a realistic
integer between 15 and 180.

suggested_date should use YYYY-MM-DD when
a date can reasonably be determined.

If a date cannot reasonably be determined,
use null.

course_id should be the actual course ID
when the recommendation relates to a course.
Otherwise use null.

Return ONLY valid JSON.

Use this exact structure:

{
  "recommendations": [
    {
      "title": "string",
      "recommendation": "string",
      "reason": "string",
      "priority": "low",
      "estimated_minutes": 30,
      "suggested_date": "YYYY-MM-DD",
      "course_id": "uuid"
    }
  ]
}

STUDENT DATA:

${formattedContext}
`;

    const response =
      await generateAIResponse({
        systemInstruction: `
You are StudySpace's academic planning
engine.

Your purpose is to analyze real student
data and generate practical study
recommendations.

Never fabricate student-specific facts.

Return valid JSON only.
        `,
        prompt,
      });

    let parsed: {
      recommendations?: Array<{
        title?: string;
        recommendation?: string;
        reason?: string;
        priority?: string;
        estimated_minutes?: number;
        suggested_date?: string | null;
        course_id?: string | null;
      }>;
    };

    try {
      parsed = JSON.parse(response);
    } catch {
      /*
       * Sometimes models wrap JSON in markdown.
       */

      const cleaned = response
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return NextResponse.json(
          {
            error:
              "The AI returned an invalid recommendation format.",
          },
          { status: 500 }
        );
      }
    }

    const recommendations =
      Array.isArray(
        parsed.recommendations
      )
        ? parsed.recommendations
        : [];

    if (
      recommendations.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "The AI could not generate any study recommendations right now.",
        },
        { status: 500 }
      );
    }

    /*
     * Validate and normalize the AI output
     * before saving it to Supabase.
     */

    const validPriorities = [
      "low",
      "medium",
      "high",
      "urgent",
    ];

    const normalized =
      recommendations
        .slice(0, 6)
        .map((item) => {
          const priority =
            validPriorities.includes(
              item.priority || ""
            )
              ? item.priority!
              : "medium";

          const minutes =
            Number(
              item.estimated_minutes
            );

          const estimatedMinutes =
            Number.isFinite(minutes)
              ? Math.min(
                  180,
                  Math.max(
                    15,
                    Math.round(minutes)
                  )
                )
              : 30;

          return {
            user_id: user.id,

            course_id:
              item.course_id || null,

            title:
              item.title?.trim() ||
              "Study recommendation",

            recommendation:
              item.recommendation?.trim() ||
              "Review your upcoming academic work.",

            reason:
              item.reason?.trim() || "",

            priority,

            estimated_minutes:
              estimatedMinutes,

            suggested_date:
              item.suggested_date || null,

            source: "ai" as const,

            completed: false,
          };
        });

    /*
     * Save recommendations.
     */

    const {
      data: saved,
      error: saveError,
    } = await supabase
      .from("study_recommendations")
      .insert(normalized)
      .select("*");

    if (saveError) {
      throw new Error(
        saveError.message
      );
    }

    /*
     * Create notifications for the most
     * important recommendations.
     */

    const important =
      (saved || []).filter(
        (item) =>
          item.priority === "urgent" ||
          item.priority === "high"
      );

    if (important.length > 0) {
      const notifications =
        important.map((item) => ({
          user_id: user.id,

          type: "ai_recommendation",

          title:
            item.title,

          message:
            item.recommendation,

          href:
            "/dashboard",

          metadata: {
            recommendation_id:
              item.id,

            priority:
              item.priority,

            course_id:
              item.course_id,
          },
        }));

      const {
        error: notificationError,
      } = await supabase
        .from("notifications")
        .insert(
          notifications
        );

      if (notificationError) {
        console.error(
          "Could not create recommendation notifications:",
          notificationError.message
        );
      }
    }

    return NextResponse.json({
      recommendations:
        saved || [],
    });
  } catch (error) {
    console.error(
      "AI recommendation error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Could not generate study recommendations.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}