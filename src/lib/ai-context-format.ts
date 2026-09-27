type AnyRecord = Record<string, unknown>;

function clean(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return String(value);
}

function pickText(
  record: AnyRecord,
  keys: string[]
) {
  for (const key of keys) {
    const value = clean(record[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

function formatDate(value: unknown) {
  const text = clean(value);

  if (!text) {
    return "Not provided";
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleString(
    "en-CA",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

export function formatStudentAIContext(
  context: {
    courses: AnyRecord[];
    notes: AnyRecord[];
    resources: AnyRecord[];
    assignments: AnyRecord[];
    quizzes: AnyRecord[];
    quizAttempts: AnyRecord[];
    homework: AnyRecord[];
    calendarEvents: AnyRecord[];
  }
) {
  const sections: string[] = [];

  /*
   * COURSES
   */

  sections.push(`
========================
STUDENT COURSES
========================

${
  context.courses.length
    ? context.courses
        .map(
          (course, index) => `
COURSE ${index + 1}

Code:
${clean(course.code)}

Name:
${clean(course.name)}

Professor:
${clean(course.professor) || "Not provided"}

Room:
${clean(course.room) || "Not provided"}

Schedule:
${clean(course.schedule) || "Not provided"}

Progress:
${clean(course.progress) || "Not provided"}

Target grade:
${clean(course.target_grade) || "Not provided"}

Credits:
${clean(course.credits) || "Not provided"}

Semester:
${clean(course.semester) || "Not provided"}

Description:
${clean(course.description) || "Not provided"}
`
        )
        .join("\n")
    : "No active courses found."
}
`);

  /*
   * NOTES
   */

  sections.push(`
========================
COURSE NOTES
========================

${
  context.notes.length
    ? context.notes
        .map(
          (note, index) => `
NOTE ${index + 1}

Course ID:
${clean(note.course_id)}

Title:
${
  pickText(note, [
    "title",
    "name",
    "heading",
    "subject",
  ]) || `Note ${index + 1}`
}

Content:
${
  pickText(note, [
    "content",
    "body",
    "text",
    "note",
    "description",
  ]) || "(No text available.)"
}
`
        )
        .join("\n")
    : "No course notes found."
}
`);

  /*
   * MATERIALS
   */

  sections.push(`
========================
COURSE MATERIALS
========================

${
  context.resources.length
    ? context.resources
        .map(
          (resource, index) => `
RESOURCE ${index + 1}

Course ID:
${clean(resource.course_id)}

Title:
${
  pickText(resource, [
    "title",
    "name",
    "heading",
  ]) || `Resource ${index + 1}`
}

Description:
${
  pickText(resource, [
    "description",
    "content",
    "body",
    "text",
  ]) || "Not provided"
}

URL:
${
  pickText(resource, [
    "url",
    "file_url",
    "resource_url",
  ]) || "Not provided"
}
`
        )
        .join("\n")
    : "No course materials found."
}
`);

  /*
   * ASSIGNMENTS
   */

  sections.push(`
========================
ASSIGNMENTS
========================

${
  context.assignments.length
    ? context.assignments
        .map(
          (assignment, index) => `
ASSIGNMENT ${index + 1}

Course ID:
${clean(assignment.course_id)}

Title:
${clean(assignment.title)}

Description:
${clean(assignment.description) || "Not provided"}

Due:
${formatDate(assignment.due_date)}

Priority:
${clean(assignment.priority) || "Not provided"}

Status:
${clean(assignment.status) || "Not provided"}

Progress:
${clean(assignment.progress) || "Not provided"}

Points:
${clean(assignment.points) || "Not provided"} / ${
            clean(assignment.max_points) ||
            "Not provided"
          }
`
        )
        .join("\n")
    : "No assignments found."
}
`);

  /*
   * QUIZZES
   */

  sections.push(`
========================
QUIZZES
========================

${
  context.quizzes.length
    ? context.quizzes
        .map(
          (quiz, index) => `
QUIZ ${index + 1}

Quiz ID:
${clean(quiz.id)}

Course ID:
${clean(quiz.course_id)}

Title:
${clean(quiz.title)}

Difficulty:
${clean(quiz.difficulty) || "Not provided"}

Created:
${formatDate(quiz.created_at)}
`
        )
        .join("\n")
    : "No quizzes found."
}
`);

  /*
   * QUIZ ATTEMPTS
   */

  sections.push(`
========================
QUIZ ATTEMPTS / PERFORMANCE
========================

${
  context.quizAttempts.length
    ? context.quizAttempts
        .map(
          (attempt, index) => `
ATTEMPT ${index + 1}

Quiz ID:
${clean(attempt.quiz_id)}

Score:
${
  pickText(attempt, [
    "score",
    "percentage",
    "percent",
  ]) || "Not provided"
}

Correct:
${
  pickText(attempt, [
    "correct_answers",
    "correct",
  ]) || "Not provided"
}

Total:
${
  pickText(attempt, [
    "total_questions",
    "total",
  ]) || "Not provided"
}

Completed:
${formatDate(
  pickText(attempt, [
    "completed_at",
    "created_at",
  ])
)}
`
        )
        .join("\n")
    : "No quiz attempts found."
}
`);

  /*
   * HOMEWORK
   */

  sections.push(`
========================
HOMEWORK
========================

${
  context.homework.length
    ? context.homework
        .map(
          (item, index) => `
HOMEWORK ${index + 1}

Homework ID:
${clean(item.id)}

Course ID:
${clean(item.course_id)}

Assignment ID:
${clean(item.assignment_id)}

Title:
${clean(item.title)}

Description:
${clean(item.description) || "Not provided"}

File:
${clean(item.file_name) || "Not provided"}

Status:
${clean(item.status)}

AI Summary:
${clean(item.ai_summary) || "No AI summary available."}

AI Explanation:
${
  clean(item.ai_explanation) ||
  "No AI explanation available."
}

AI Solution:
${
  clean(item.ai_solution) ||
  "No AI solution available."
}

AI Hints:
${
  Array.isArray(item.ai_hints)
    ? item.ai_hints.join("\n- ")
    : clean(item.ai_hints) ||
      "No hints available."
}
`
        )
        .join("\n")
    : "No homework records found."
}
`);

  /*
   * CALENDAR
   */

  sections.push(`
========================
CALENDAR / SCHEDULE
========================

${
  context.calendarEvents.length
    ? context.calendarEvents
        .map(
          (event, index) => `
EVENT ${index + 1}

Title:
${clean(event.title)}

Subtitle:
${clean(event.subtitle)}

Type:
${clean(event.event_type)}

Start:
${formatDate(event.start_at)}

End:
${formatDate(event.end_at)}

Location:
${clean(event.location) || "Not provided"}

Course ID:
${clean(event.course_id) || "Not provided"}

Description:
${clean(event.description) || "Not provided"}

Notes:
${clean(event.notes) || "Not provided"}

Multitask:
${clean(event.multitask) || "false"}
`
        )
        .join("\n")
    : "No calendar events found."
}
`);

  return sections.join("\n\n");
}


/*
 * ---------------------------------------------------------
 * BACKWARD COMPATIBILITY
 * ---------------------------------------------------------
 */

export function formatCourseAIContext(
  context: {
    course: AnyRecord;
    notes: AnyRecord[];
    resources: AnyRecord[];
    assignments?: AnyRecord[];
    quizzes?: AnyRecord[];
    quizAttempts?: AnyRecord[];
    homework?: AnyRecord[];
    calendarEvents?: AnyRecord[];
  }
) {
  return formatStudentAIContext({
    courses: [context.course],
    notes: context.notes,
    resources: context.resources,
    assignments:
      context.assignments || [],
    quizzes:
      context.quizzes || [],
    quizAttempts:
      context.quizAttempts || [],
    homework:
      context.homework || [],
    calendarEvents:
      context.calendarEvents || [],
  });
}