import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

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

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing from the server environment."
    );
  }

  return new GoogleGenAI({
    apiKey,
  });
}

function cleanJson(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * --------------------------------------------------
     * AUTHENTICATION
     * --------------------------------------------------
     */

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const token =
      authorization.slice("Bearer ".length);

    const supabase =
      createSupabaseServerClient(token);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Your session has expired.",
        },
        { status: 401 }
      );
    }

    /*
     * --------------------------------------------------
     * REQUEST
     * --------------------------------------------------
     */

    const body = await request.json();

    const {
      homeworkId,
      title,
      description,
      courseName,
      courseCode,
    } = body;

    if (!homeworkId) {
      return NextResponse.json(
        {
          error:
            "A homework ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * LOAD HOMEWORK
     * --------------------------------------------------
     */

    const { data: homework, error: homeworkError } =
      await supabase
        .from("homework")
        .select("*")
        .eq("id", homeworkId)
        .eq("user_id", user.id)
        .single();

    if (homeworkError || !homework) {
      return NextResponse.json(
        {
          error: "Homework record not found.",
        },
        { status: 404 }
      );
    }

    if (!homework.file_path) {
      return NextResponse.json(
        {
          error:
            "This homework record does not have a file attached.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * DOWNLOAD FILE FROM PRIVATE STORAGE
     * --------------------------------------------------
     */

    console.log(
      "Creating homework signed URL:",
      homework.file_path
    );

    const {
      data: signedUrlData,
      error: signedUrlError,
    } =
      await supabase.storage
        .from("homework")
        .createSignedUrl(
          homework.file_path,
          60 * 10
        );

    if (signedUrlError) {
      console.error(
        "Signed URL error:",
        signedUrlError
      );

      return NextResponse.json(
        {
          error:
            `Could not access homework file: ${signedUrlError.message}`,
        },
        { status: 500 }
      );
    }

    const fileResponse = await fetch(
      signedUrlData.signedUrl
    );

    if (!fileResponse.ok) {
      return NextResponse.json(
        {
          error:
            `Could not download homework file (${fileResponse.status}).`,
        },
        { status: 500 }
      );
    }

    const arrayBuffer =
      await fileResponse.arrayBuffer();

    const base64 = Buffer.from(
      arrayBuffer
    ).toString("base64");

    const mimeType =
      homework.file_type ||
      fileResponse.headers.get(
        "content-type"
      ) ||
      "application/octet-stream";

    /*
     * --------------------------------------------------
     * BUILD GEMINI REQUEST
     * --------------------------------------------------
     */

    const ai = getGeminiClient();

    const prompt = `
You are analyzing a student's homework inside StudySpace.

HOMEWORK TITLE:
${title || homework.title || "Untitled"}

COURSE:
${courseCode || ""} ${courseName || ""}

DESCRIPTION:
${description || homework.description || "None provided"}

Analyze the attached homework carefully.

Return ONLY valid JSON using this exact structure:

{
  "summary": "Brief description of what the homework is asking.",
  "explanation": "Teach the concepts needed to understand the homework.",
  "solution": "Give a detailed solution or solution approach.",
  "hints": [
    "Useful hint 1",
    "Useful hint 2",
    "Useful hint 3"
  ]
}

Rules:

- Carefully read the attached homework.
- Do not invent information that is not present.
- If part of the homework is unreadable or missing, explicitly say so.
- Explain reasoning rather than only giving final answers.
- For mathematics and physics, show important calculation steps.
- For programming questions, explain the algorithm and reasoning.
- For writing assignments, explain how the student should approach the task.
- Match the apparent academic level.
- Make the explanation educational.
- Do not pretend to know instructor requirements that are not shown.
`;

    console.log(
      "Sending homework file to Gemini:",
      {
        homeworkId,
        mimeType,
        fileSize: arrayBuffer.byteLength,
      }
    );

    /*
     * --------------------------------------------------
     * GEMINI MULTIMODAL REQUEST
     * --------------------------------------------------
     */

    const response =
      await ai.models.generateContent({
        model:
          process.env.GEMINI_MODEL ||
          "gemini-3.8-flash",

        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],

        config: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });

    const raw =
      response.text?.trim();

    if (!raw) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }

    console.log(
      "Gemini homework response received."
    );

    /*
     * --------------------------------------------------
     * PARSE RESPONSE
     * --------------------------------------------------
     */

    let result;

    try {
      result = JSON.parse(
        cleanJson(raw)
      );
    } catch {
      console.error(
        "Gemini returned invalid JSON:",
        raw
      );

      return NextResponse.json(
        {
          error:
            "Gemini returned an invalid analysis. Please try again.",
        },
        { status: 502 }
      );
    }

    /*
     * --------------------------------------------------
     * SAVE ANALYSIS
     * --------------------------------------------------
     */

    const summary =
      result.summary || "";

    const explanation =
      result.explanation || "";

    const solution =
      result.solution || "";

    const hints =
      Array.isArray(result.hints)
        ? result.hints
        : [];

    const { error: updateError } =
      await supabase
        .from("homework")
        .update({
          status: "analyzed",
          ai_summary: summary,
          ai_solution: solution,
          ai_explanation: explanation,
          ai_hints: hints,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", homeworkId)
        .eq("user_id", user.id);

    if (updateError) {
      throw new Error(
        `Could not save AI analysis: ${updateError.message}`
      );
    }

    return NextResponse.json({
      summary,
      explanation,
      solution,
      hints,
    });
  } catch (error) {
    console.error(
      "Homework AI error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze homework.",
      },
      { status: 500 }
    );
  }
}