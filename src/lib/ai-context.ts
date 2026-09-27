import "server-only";

import { createClient } from "@supabase/supabase-js";

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

function createSupabaseServerClient(token: string) {
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

export async function getCourseAIContext(
  token: string,
  courseId: string
) {
  const supabase: SupabaseServerClient =
    createSupabaseServerClient(token);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new Error("Your session has expired.");
  }

  /*
   * COURSE
   */

  const { data: course, error: courseError } =
    await supabase
      .from("courses")
      .select(
        `
        id,
        code,
        name,
        professor,
        room,
        schedule,
        progress,
        description,
        target_grade,
        credits,
        semester
      `
      )
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (courseError) {
    throw new Error(courseError.message);
  }

  if (!course) {
    throw new Error("Course not found.");
  }

  /*
   * NOTES
   *
   * We intentionally query this separately so that if the
   * notes schema needs adjusting, it doesn't affect the
   * rest of the AI context system.
   */

  const { data: notes, error: notesError } =
    await supabase
      .from("course_notes")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", {
        ascending: false,
      });

  if (notesError) {
    console.error(
      "Could not load course notes:",
      notesError.message
    );
  }

  /*
   * RESOURCES / MATERIALS
   */

  const { data: resources, error: resourcesError } =
    await supabase
      .from("course_resources")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", {
        ascending: false,
      });

  if (resourcesError) {
    console.error(
      "Could not load course resources:",
      resourcesError.message
    );
  }

  return {
    course,
    notes: notes || [],
    resources: resources || [],
  };
}