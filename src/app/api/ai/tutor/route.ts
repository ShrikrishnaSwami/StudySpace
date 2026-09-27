import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { generateAIResponse } from "@/lib/gemini";
import { getStudentAIContext } from "@/lib/ai-context";
import { formatStudentAIContext } from "@/lib/ai-context-format";

function createSupabaseServerClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

type RequestBody = {
  message?: string;
  courseId?: string | null;
  conversationId?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    /*
     * -------------------------------------------------------
     * AUTHENTICATION
     * -------------------------------------------------------
     */

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid authorization token.",
        },
        { status: 401 }
      );
    }

    const token =
      authorization.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        {
          error: "Missing authentication token.",
        },
        { status: 401 }
      );
    }

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
          error: "Your session has expired.",
        },
        { status: 401 }
      );
    }

    /*
     * -------------------------------------------------------
     * REQUEST BODY
     * -------------------------------------------------------
     */

    const body =
      (await request.json()) as RequestBody;

    const message =
      body.message?.trim() || "";

    const courseId =
      body.courseId || null;

    const conversationId =
      body.conversationId || null;

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Please enter a message.",
        },
        { status: 400 }
      );
    }

    if (message.length > 12000) {
      return NextResponse.json(
        {
          error:
            "Message is too long. Please keep it under 12,000 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * -------------------------------------------------------
     * VERIFY CONVERSATION
     * -------------------------------------------------------
     */

    if (conversationId) {
      const {
        data: conversation,
        error: conversationError,
      } = await supabase
        .from("ai_tutor_conversations")
        .select("id, user_id, course_id")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (conversationError) {
        return NextResponse.json(
          {
            error:
              conversationError.message,
          },
          { status: 500 }
        );
      }

      if (!conversation) {
        return NextResponse.json(
          {
            error:
              "Conversation not found.",
          },
          { status: 404 }
        );
      }
    }

    /*
     * -------------------------------------------------------
     * LOAD FULL STUDYSPACE CONTEXT
     * -------------------------------------------------------
     *
     * The AI can now see:
     *
     * Courses
     * Notes
     * Materials
     * Assignments
     * Quizzes
     * Quiz attempts
     * Homework
     * Calendar
     *
     * If a course is selected, the context is narrowed
     * to that course where appropriate.
     */

    let studySpaceContext = "";

    try {
      const context =
        await getStudentAIContext(
          token,
          courseId
        );

      studySpaceContext =
        formatStudentAIContext(context);
    } catch (contextError) {
      console.error(
        "Failed to load StudySpace AI context:",
        contextError
      );

      studySpaceContext = `
========================
STUDYSPACE CONTEXT
========================

The student's StudySpace data could not be loaded.

Do NOT invent:
- courses
- assignments
- deadlines
- grades
- quizzes
- quiz results
- homework
- notes
- calendar events

You may still answer using general academic
knowledge, but clearly state when student-specific
information is unavailable.
`;
    }

    /*
     * -------------------------------------------------------
     * LOAD RECENT CONVERSATION HISTORY
     * -------------------------------------------------------
     */

    let conversationHistory = "";

    if (conversationId) {
      const {
        data: messages,
        error: messagesError,
      } = await supabase
        .from("ai_tutor_messages")
        .select("role, content, created_at")
        .eq(
          "conversation_id",
          conversationId
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(20);

      if (messagesError) {
        console.error(
          "Could not load conversation history:",
          messagesError.message
        );
      } else {
        const orderedMessages =
          [...(messages || [])].reverse();

        conversationHistory =
          orderedMessages
            .map(
              (item) =>
                `${item.role === "user" ? "STUDENT" : "AI TUTOR"}: ${item.content}`
            )
            .join("\n\n");
      }
    }

    /*
     * -------------------------------------------------------
     * SYSTEM INSTRUCTION
     * -------------------------------------------------------
     */

    const systemInstruction = `
You are StudySpace AI Tutor.

You are an academic tutor, study planner,
and learning assistant built into StudySpace.

Your job is to help the student understand
their courses and make better decisions about
their studying.

========================================
STUDENT DATA RULES
========================================

StudySpace has supplied real data belonging
to the current student.

Treat supplied StudySpace data as factual
student-specific information.

NEVER invent student-specific information.

Do not invent:
- courses
- professors
- assignments
- assignment deadlines
- grades
- quiz results
- homework
- notes
- course materials
- calendar events
- study sessions
- progress percentages

If the required information is not present,
say that it is not available.

You may use general academic knowledge to
explain concepts or solve problems.

Clearly distinguish between:

1. Stored StudySpace information
2. General academic knowledge
3. Your recommendations

========================================
STUDY RECOMMENDATIONS
========================================

When recommending what the student should study,
consider their actual:

- upcoming assignments
- assignment priorities
- assignment progress
- upcoming calendar events
- course progress
- quiz history
- homework
- course notes
- course materials
- target grades

Do not recommend that the student completed
something unless the supplied data shows it.

When dates are available, prioritize work based
on urgency and workload.

If several tasks compete for attention, explain
the reasoning behind the suggested order.

========================================
ACADEMIC TUTORING
========================================

Teach rather than simply giving answers.

For mathematics, physics, chemistry,
computer science, and other technical subjects:

- show the important reasoning
- explain formulas
- walk through calculations
- identify mistakes when possible
- use examples when useful

For conceptual questions:

- explain clearly
- use intuitive examples
- connect ideas to the student's notes when
  relevant
- avoid unnecessary jargon

========================================
COURSE NOTES
========================================

When the student asks about something covered
in their StudySpace notes:

1. Prefer their stored notes.
2. Explain the material clearly.
3. If their notes appear incomplete, supplement
   them with general knowledge.
4. Make it clear when information comes from
   general knowledge rather than their notes.

Never pretend that general knowledge came from
the student's notes.

========================================
QUIZZES
========================================

If quiz information is available, you may use it
to identify areas where the student may need more
practice.

Do not invent topic performance if the supplied
data does not contain enough information.

If the student asks for practice questions,
you may create them based on the relevant course
material.

========================================
HOMEWORK
========================================

If homework records contain AI analysis,
you may use the stored:

- summaries
- explanations
- solutions
- hints

Do not claim that an uploaded homework file
contains information that is not present in
the supplied context.

========================================
CALENDAR
========================================

Use calendar information when helping the
student plan their time.

For example:

Student:
"What should I study tonight?"

Consider:
- upcoming deadlines
- upcoming quizzes
- scheduled classes
- study events
- workload
- course progress

Do not invent free time that is not supported
by the calendar data.

========================================
CONVERSATION
========================================

Use recent conversation history to maintain
continuity.

If the student refers to something discussed
earlier in the conversation, use the history
provided below.

Do not confuse conversation history with
StudySpace database records.

========================================
RESPONSE STYLE
========================================

Be:

- helpful
- clear
- encouraging
- concise when possible
- detailed when necessary

Avoid unnecessarily long responses.

Use headings and bullet points when they make
the answer easier to understand.

Do not constantly remind the student that you
are an AI.

Do not mention internal database tables,
Supabase, API routes, or implementation details
unless the student explicitly asks about them.

========================================
STUDYSPACE DATA
========================================

${studySpaceContext}

========================================
RECENT CONVERSATION
========================================

${
  conversationHistory ||
  "No previous conversation messages are available."
}
`;

    /*
     * -------------------------------------------------------
     * GENERATE RESPONSE
     * -------------------------------------------------------
     */

    const answer =
      await generateAIResponse({
        systemInstruction,
        prompt: message,
      });

    /*
     * -------------------------------------------------------
     * SAVE MESSAGES
     * -------------------------------------------------------
     *
     * The frontend currently saves messages too,
     * so we intentionally DO NOT save them here.
     *
     * This prevents duplicate messages.
     */

    return NextResponse.json({
      answer,
      courseId,
      conversationId,
    });
  } catch (error) {
    console.error(
      "AI Tutor API error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while contacting the AI Tutor.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}