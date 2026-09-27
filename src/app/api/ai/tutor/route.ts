import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { generateAIResponse } from "@/lib/gemini";
import { getCourseAIContext } from "@/lib/ai-context";
import { formatCourseAIContext } from "@/lib/ai-context-format";
export const runtime = "nodejs";

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGE_LENGTH = 6000;
const MAX_HISTORY_MESSAGES = 20;

const SYSTEM_INSTRUCTION = `
You are StudySpace AI Tutor.

You are an intelligent university study assistant.

StudySpace may provide you with information retrieved from
the student's actual StudySpace account.

This information can include:

- course information
- course notes
- course materials
- assignments
- quizzes
- homework
- calendar events
- study sessions
- academic goals

IMPORTANT DATA RULES:

1. Treat supplied StudySpace context as the student's actual
   stored information.

2. Use that information when answering questions about the
   student's courses, notes, materials, assignments, or
   academic planning.

3. Never claim that information exists in the student's
   StudySpace data unless it was actually supplied to you.

4. Never invent notes, assignments, grades, deadlines,
   professor information, or course policies.

5. If the requested information is not present in the supplied
   context, say that you could not find it in the available
   StudySpace data.

6. Distinguish between:
   - information from the student's StudySpace data
   - general academic knowledge
   - your own explanation or reasoning

7. If the student asks what their notes say, prioritize their
   stored notes over general knowledge.

8. If the student's notes contain an error, explain the issue
   respectfully rather than silently changing what their notes
   say.

TEACHING PRINCIPLES:

1. Explain concepts clearly and logically.
2. Adapt explanations to the student's level.
3. Break difficult problems into manageable steps.
4. For homework, prefer hints and guided reasoning when
   appropriate.
5. Ask concise clarifying questions when necessary.
6. Correct mistakes respectfully.
7. Use examples when useful.
8. Use Markdown for readable answers.
9. Use LaTeX-style mathematical notation when useful.
10. Avoid unnecessarily long answers.

When solving academic problems:

- Identify what the problem is asking.
- State the relevant concept or formula.
- Work through the reasoning.
- Give the final answer clearly.
- Mention important assumptions.

You are a tutor, not a replacement for the student's own learning.
`;

function getSupabaseServerClient(token: string) {
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
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to use the AI Tutor.",
        },
        { status: 401 }
      );
    }

    const token =
      authorization.slice(7);

    const supabase =
      getSupabaseServerClient(token);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Your session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const conversationId =
      typeof body.conversationId === "string"
        ? body.conversationId
        : null;

    const courseId =
      typeof body.courseId === "string"
        ? body.courseId
        : null;

    const history = Array.isArray(
      body.history
    )
      ? (body.history as TutorMessage[])
      : [];

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Please enter a message.",
        },
        { status: 400 }
      );
    }

    if (
      message.length >
      MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json(
        {
          error:
            "Your message is too long.",
        },
        { status: 413 }
      );
    }

let courseContext = "";

if (courseId) {
  try {
    const context = await getCourseAIContext(
      token,
      courseId
    );

    courseContext =
      formatCourseAIContext(context);
  } catch (error) {
    console.error(
      "Failed to load AI course context:",
      error
    );

    courseContext = `
COURSE CONTEXT

The student selected a course, but additional
course information could not be loaded.
Do not invent course-specific information.
`;
  }
}

    const safeHistory =
      history
        .filter(
          (item) =>
            item &&
            (item.role === "user" ||
              item.role === "assistant") &&
            typeof item.content ===
              "string"
        )
        .slice(
          -MAX_HISTORY_MESSAGES
        );

    const conversationHistory =
      safeHistory.length > 0
        ? safeHistory
            .map(
              (item) =>
                `${item.role === "user" ? "Student" : "Tutor"}: ${item.content}`
            )
            .join("\n\n")
        : "No previous conversation.";

    const prompt = `
${courseContext}

PREVIOUS CONVERSATION

${conversationHistory}

CURRENT STUDENT MESSAGE

${message}

Respond as the StudySpace AI Tutor.
`;

    const answer =
      await generateAIResponse({
        systemInstruction:
          SYSTEM_INSTRUCTION,
        prompt,
      });

    return NextResponse.json({
      answer,
      conversationId,
    });
  } catch (error) {
    console.error(
      "StudySpace Tutor API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The AI Tutor failed to respond.",
      },
      { status: 500 }
    );
  }
}