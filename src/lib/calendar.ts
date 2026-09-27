import { supabase } from "@/lib/supabase";

export type CalendarEventType =
  | "class"
  | "lab"
  | "study"
  | "assignment"
  | "quiz"
  | "exam"
  | "meeting"
  | "office"
  | "break"
  | "other";

export type CalendarEventSource =
  | "manual"
  | "chat"
  | "course"
  | "assignment"
  | "quiz"
  | "system"
  | "related";

export type CalendarEvent = {
  id: string;
  user_id: string;

  title: string;
  subtitle: string;
  description: string;

  start_at: string;
  end_at: string;

  event_type: CalendarEventType;

  color: string | null;

  enabled: boolean;
  multitask: boolean;

  related_to: string | null;

  source: CalendarEventSource;

  course_id: string | null;
  assignment_id: string | null;

  location: string;

  recurrence_rule: string | null;
  recurrence_end: string | null;

  notes: string;

  created_at: string;
  updated_at: string;
};

export type CreateCalendarEvent = {
  title: string;
  subtitle?: string;
  description?: string;

  start_at: string;
  end_at: string;

  event_type?: CalendarEventType;

  color?: string;

  enabled?: boolean;
  multitask?: boolean;

  related_to?: string | null;

  source?: CalendarEventSource;

  course_id?: string | null;
  assignment_id?: string | null;

  location?: string;

  recurrence_rule?: string | null;
  recurrence_end?: string | null;

  notes?: string;
};

const EVENT_COLORS: Record<CalendarEventType, string> = {
  class: "#7c3aed",
  lab: "#06b6d4",
  study: "#f59e0b",
  assignment: "#ef4444",
  quiz: "#ec4899",
  exam: "#dc2626",
  meeting: "#8b5cf6",
  office: "#a855f7",
  break: "#64748b",
  other: "#6366f1",
};

export function getEventColor(
  type: CalendarEventType,
  customColor?: string | null
) {
  return customColor || EVENT_COLORS[type] || EVENT_COLORS.other;
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
) {
  return (
    new Date(aStart).getTime() <
      new Date(bEnd).getTime() &&
    new Date(bStart).getTime() <
      new Date(aEnd).getTime()
  );
}

export async function getCalendarEvents(
  start?: string,
  end?: string
) {
  let query = supabase
    .from("calendar_events")
    .select("*")
    .order("start_at", { ascending: true });

  /*
   * Proper overlap filtering:
   *
   * event.start < requestedEnd
   * AND
   * event.end > requestedStart
   */
  if (start && end) {
    query = query
      .lt("start_at", end)
      .gt("end_at", start);
  } else if (start) {
    query = query.gt("end_at", start);
  } else if (end) {
    query = query.lt("start_at", end);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as CalendarEvent[];
}

export async function getCalendarEvent(id: string) {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CalendarEvent;
}

export async function findConflicts(
  startAt: string,
  endAt: string,
  excludeId?: string
) {
  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("enabled", true)
    .eq("multitask", false)
    .lt("start_at", endAt)
    .gt("end_at", startAt)
    .order("start_at", { ascending: true });

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).filter((event) =>
    overlaps(
      startAt,
      endAt,
      event.start_at,
      event.end_at
    )
  ) as CalendarEvent[];
}

export async function createCalendarEvent(
  input: CreateCalendarEvent
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  if (!input.title.trim()) {
    throw new Error("Event title is required.");
  }

  if (
    new Date(input.end_at).getTime() <=
    new Date(input.start_at).getTime()
  ) {
    throw new Error("End time must be after start time.");
  }

  const conflicts = await findConflicts(
    input.start_at,
    input.end_at
  );

  const shouldDisable =
    conflicts.length > 0 &&
    input.enabled !== false &&
    input.multitask !== true;

  const eventType = input.event_type || "other";

  const payload = {
    user_id: user.id,

    title: input.title.trim(),
    subtitle: input.subtitle || "",
    description: input.description || "",

    start_at: input.start_at,
    end_at: input.end_at,

    event_type: eventType,

    color: getEventColor(
      eventType,
      input.color
    ),

    enabled: shouldDisable
      ? false
      : input.enabled ?? true,

    multitask: input.multitask ?? false,

    related_to: input.related_to || null,

    source: input.source || "manual",

    course_id: input.course_id || null,
    assignment_id: input.assignment_id || null,

    location: input.location || "",

    recurrence_rule:
      input.recurrence_rule || null,

    recurrence_end:
      input.recurrence_end || null,

    notes: input.notes || "",
  };

  const { data, error } = await supabase
    .from("calendar_events")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    event: data as CalendarEvent,
    conflicts,
    disabled: shouldDisable,
    message: shouldDisable
      ? "Event created but disabled because it conflicts with another event."
      : "Event created.",
  };
}

export async function updateCalendarEvent(
  id: string,
  changes: Partial<CreateCalendarEvent>
) {
  const current = await getCalendarEvent(id);

  const startAt =
    changes.start_at || current.start_at;

  const endAt =
    changes.end_at || current.end_at;

  if (
    new Date(endAt).getTime() <=
    new Date(startAt).getTime()
  ) {
    throw new Error("End time must be after start time.");
  }

  const conflicts = await findConflicts(
    startAt,
    endAt,
    id
  );

  const multitask =
    changes.multitask ??
    current.multitask;

  const explicitlyDisabled =
    changes.enabled === false;

  const explicitlyEnabled =
    changes.enabled === true;

  let enabled = current.enabled;

  if (explicitlyDisabled) {
    enabled = false;
  } else if (
    conflicts.length > 0 &&
    !multitask
  ) {
    enabled = false;
  } else if (explicitlyEnabled) {
    enabled = true;
  }

  const payload: Record<string, unknown> = {
    ...changes,

    start_at: startAt,
    end_at: endAt,

    enabled,

    updated_at: new Date().toISOString(),
  };

  if (changes.event_type) {
    payload.color = getEventColor(
      changes.event_type,
      changes.color
    );
  } else if (changes.color !== undefined) {
    payload.color = changes.color;
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    event: data as CalendarEvent,
    conflicts,
    disabled: !enabled,
  };
}

export async function deleteCalendarEvent(
  id: string
) {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function toggleCalendarEvent(
  id: string,
  enabled: boolean
) {
  return updateCalendarEvent(id, {
    enabled,
  });
}

export async function toggleMultitask(
  id: string,
  multitask: boolean
) {
  return updateCalendarEvent(id, {
    multitask,
  });
}

export async function createRelatedEvent(
  parent: CalendarEvent,
  input: {
    title?: string;
    start_at?: string;
    end_at?: string;
    event_type?: CalendarEventType;
    multitask?: boolean;
    notes?: string;
  }
) {
  const startAt =
    input.start_at || parent.end_at;

  const endAt =
    input.end_at ||
    new Date(
      new Date(startAt).getTime() +
        60 * 60 * 1000
    ).toISOString();

  return createCalendarEvent({
    title:
      input.title ||
      `Study: ${parent.title}`,

    subtitle: parent.subtitle,

    start_at: startAt,
    end_at: endAt,

    event_type:
      input.event_type || "study",

    multitask:
      input.multitask ?? true,

    related_to: parent.id,

    source: "related",

    course_id: parent.course_id,

    notes:
      input.notes ||
      `Related to ${parent.title}`,
  });
}

export async function createCommuteEvent(
  parent: CalendarEvent,
  position: "before" | "after",
  durationMinutes: number
) {
  if (durationMinutes <= 0) {
    throw new Error(
      "Commute duration must be greater than zero."
    );
  }

  const duration =
    durationMinutes * 60 * 1000;

  const start =
    position === "before"
      ? new Date(
          new Date(parent.start_at).getTime() -
            duration
        )
      : new Date(parent.end_at);

  const end =
    position === "before"
      ? new Date(parent.start_at)
      : new Date(
          new Date(parent.end_at).getTime() +
            duration
        );

  return createCalendarEvent({
    title: `Commute: ${parent.title}`,

    subtitle: parent.subtitle,

    start_at: start.toISOString(),
    end_at: end.toISOString(),

    event_type: "other",

    multitask: false,

    related_to: parent.id,

    source: "related",

    location: parent.location,

    notes:
      position === "before"
        ? `Commute before ${parent.title}`
        : `Commute after ${parent.title}`,
  });
}