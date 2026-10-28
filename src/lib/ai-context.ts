import "server-only";

import { createClient } from "@supabase/supabase-js";

type SupabaseServerClient =
  ReturnType<typeof createSupabaseServerClient>;

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

export async function getStudentAIContext(
  token: string,
  courseId?: string | null
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
   * -------------------------------------------------------
   * COURSES
   * -------------------------------------------------------
   */

  let coursesQuery = supabase
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
      semester,
      archived
      `
    )
    .eq("user_id", user.id)
    .eq("archived", false);

  if (courseId) {
    coursesQuery = coursesQuery.eq("id", courseId);
  }

  const {
    data: courses,
    error: coursesError,
  } = await coursesQuery;

  if (coursesError) {
    throw new Error(coursesError.message);
  }

  /*
   * -------------------------------------------------------
   * NOTES
   * -------------------------------------------------------
   */

  const courseIds = (courses || []).map(
    (course) => course.id
  );


  // Fetch independent student data concurrently; serial queries added latency
  // to every AI Tutor request even when the model was ready.
  const notesQuery = courseIds.length
    ? supabase.from("course_notes").select("*").in("course_id", courseIds).order("created_at", { ascending: false })
    : Promise.resolve({ data: [], error: null });
  const resourcesQuery = courseIds.length
    ? supabase.from("course_resources").select("*").in("course_id", courseIds).order("created_at", { ascending: false })
    : Promise.resolve({ data: [], error: null });

  let assignmentsQuery = supabase.from("assignments").select("*").eq("user_id", user.id).order("due_date", { ascending: true });
  if (courseId) assignmentsQuery = assignmentsQuery.eq("course_id", courseId);

  let quizzesQuery = supabase.from("quizzes").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (courseId) quizzesQuery = quizzesQuery.eq("course_id", courseId);

  let homeworkQuery = supabase.from("homework").select(`
      id, course_id, assignment_id, title, description, file_name, file_type,
      status, ai_summary, ai_solution, ai_explanation, ai_hints, created_at, updated_at
    `).eq("user_id", user.id).order("created_at", { ascending: false });
  if (courseId) homeworkQuery = homeworkQuery.eq("course_id", courseId);

  const [notesResult, resourcesResult, assignmentsResult, quizzesResult, attemptsResult, homeworkResult, calendarResult] = await Promise.all([
    notesQuery,
    resourcesQuery,
    assignmentsQuery,
    quizzesQuery,
    supabase.from("quiz_attempts").select("*").eq("user_id", user.id).order("completed_at", { ascending: false, nullsFirst: false }).limit(100),
    homeworkQuery,
    supabase.from("calendar_events").select("*").eq("user_id", user.id).eq("enabled", true).order("start_at", { ascending: true }).limit(200),
  ]);

  if (notesResult.error) console.error("Could not load course notes:", notesResult.error.message);
  if (resourcesResult.error) console.error("Could not load course resources:", resourcesResult.error.message);
  if (assignmentsResult.error) console.error("Could not load assignments:", assignmentsResult.error.message);
  if (quizzesResult.error) console.error("Could not load quizzes:", quizzesResult.error.message);
  if (attemptsResult.error) console.error("Could not load quiz attempts:", attemptsResult.error.message);
  if (homeworkResult.error) console.error("Could not load homework:", homeworkResult.error.message);
  if (calendarResult.error) console.error("Could not load calendar:", calendarResult.error.message);

  const notes = (notesResult.data || []) as Record<string, unknown>[];
  const resources = (resourcesResult.data || []) as Record<string, unknown>[];
  const assignments = assignmentsResult.data || [];
  const quizzes = quizzesResult.data || [];
  const quizAttempts = attemptsResult.data || [];
  const homework = homeworkResult.data || [];
  const calendarEvents = calendarResult.data || [];

  return {
    user: {
      id: user.id,
      email: user.email || "",
    },

    courses: courses || [],

    notes,

    resources,

    assignments:
      assignments || [],

    quizzes:
      quizzes || [],

    quizAttempts:
      quizAttempts || [],

    homework:
      homework || [],

    calendarEvents:
      calendarEvents || [],
  };
}


/*
 * ---------------------------------------------------------
 * BACKWARD COMPATIBILITY
 * ---------------------------------------------------------
 *
 * Existing AI Tutor code can continue calling
 * getCourseAIContext().
 */

export async function getCourseAIContext(
  token: string,
  courseId: string
) {
  const context =
    await getStudentAIContext(
      token,
      courseId
    );

  const course = context.courses[0];

  if (!course) {
    throw new Error("Course not found.");
  }

  return {
    course,

    notes: context.notes,

    resources: context.resources,

    assignments: context.assignments,

    quizzes: context.quizzes,

    quizAttempts:
      context.quizAttempts,

    homework:
      context.homework,

    calendarEvents:
      context.calendarEvents,
  };
}