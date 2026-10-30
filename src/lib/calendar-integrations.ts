import { supabase } from "@/lib/supabase";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/calendar";

type AssignmentCalendarInput = {
  assignmentId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  courseId?: string | null;
};

function getAssignmentTimes(
  dueDate: string
) {
  const due = new Date(dueDate);

  if (Number.isNaN(due.getTime())) {
    throw new Error(
      "Invalid assignment due date."
    );
  }

  const start = new Date(
    due.getTime() - 60 * 60 * 1000
  );

  return {
    startAt: start.toISOString(),
    endAt: due.toISOString(),
  };
}

export async function findAssignmentCalendarEvent(
  assignmentId: string
) {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("source", "assignment")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createAssignmentCalendarEvent(
  input: AssignmentCalendarInput
) {
  const {
    startAt,
    endAt,
  } = getAssignmentTimes(input.dueDate);

  return createCalendarEvent({
    title: input.title,

    subtitle:
      "Assignment deadline",

    description:
      input.description || "",

    start_at: startAt,
    end_at: endAt,

    event_type: "assignment",

    source: "assignment",

    course_id:
      input.courseId || null,

    assignment_id:
      input.assignmentId,

    /*
     * A deadline shouldn't block
     * another calendar event.
     */
    multitask: true,

    notes:
      "Automatically created from an assignment.",
  });
}

export async function syncAssignmentCalendarEvent(
  input: AssignmentCalendarInput
) {
  const existing =
    await findAssignmentCalendarEvent(
      input.assignmentId
    );

  const {
    startAt,
    endAt,
  } = getAssignmentTimes(input.dueDate);

  if (!existing) {
    return createAssignmentCalendarEvent(
      input
    );
  }

  return updateCalendarEvent(
    existing.id,
    {
      title: input.title,

      subtitle:
        "Assignment deadline",

      description:
        input.description || "",

      start_at: startAt,
      end_at: endAt,

      event_type: "assignment",

      source: "assignment",

      course_id:
        input.courseId || null,

      assignment_id:
        input.assignmentId,

      multitask: true,

      notes:
        "Automatically created from an assignment.",
    }
  );
}

export async function deleteAssignmentCalendarEvent(
  assignmentId: string
) {
  const existing =
    await findAssignmentCalendarEvent(
      assignmentId
    );

  if (!existing) {
    return false;
  }

  await deleteCalendarEvent(
    existing.id
  );

  return true;
}