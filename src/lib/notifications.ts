import { supabase } from "@/lib/supabase";

export type NotificationType =
  | "assignment_due"
  | "assignment_overdue"
  | "quiz_upcoming"
  | "quiz_result"
  | "study_reminder"
  | "calendar_conflict"
  | "ai_recommendation"
  | "system";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  href: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

export async function getNotifications(
  limit = 50
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Notification[];
}

/**
 * Create missing in-app reminders for assignments due soon/overdue and
 * quiz events starting within the next 24 hours. Runs when the dashboard
 * is opened/refreshed; it does not send email.
 */
export async function syncAcademicReminders() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) return 0;

  const settings = user.user_metadata?.studyspace_settings || {};
  const assignmentReminders = settings.assignmentReminders !== false;
  const quizReminders = settings.quizReminders !== false;
  if (!assignmentReminders && !quizReminders) return 0;

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: existing, error: existingError } = await supabase
    .from("notifications")
    .select("type,metadata")
    .eq("user_id", user.id)
    .in("type", ["assignment_due", "assignment_overdue", "quiz_upcoming"])
    .limit(1000);
  if (existingError) throw new Error(existingError.message);

  const existingKeys = new Set((existing || []).map((item) => {
    const metadata = item.metadata as Record<string, unknown> | null;
    return String(item.type) + ":" + String(metadata?.source_id || "");
  }));
  const pending: {
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    href: string;
    metadata: Record<string, unknown>;
  }[] = [];

  if (assignmentReminders) {
    const { data: assignments, error } = await supabase
      .from("assignments")
      .select("id,title,due_date,status")
      .eq("user_id", user.id)
      .neq("status", "completed")
      .not("due_date", "is", null)
      .lte("due_date", soon.toISOString())
      .limit(250);
    if (error) throw new Error(error.message);

    for (const assignment of assignments || []) {
      if (!assignment.due_date) continue;
      const due = new Date(assignment.due_date);
      if (Number.isNaN(due.getTime())) continue;
      const overdue = due.getTime() < now.getTime();
      const type: NotificationType = overdue ? "assignment_overdue" : "assignment_due";
      const key = type + ":" + assignment.id;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      pending.push({
        user_id: user.id,
        type,
        title: overdue ? "Assignment overdue" : "Assignment due soon",
        message: assignment.title + (overdue ? " is past its due date." : " is due within 24 hours."),
        href: "/assignments/" + assignment.id,
        metadata: { source_type: "assignment", source_id: assignment.id, due_date: assignment.due_date },
      });
    }
  }

  if (quizReminders) {
    const { data: events, error } = await supabase
      .from("calendar_events")
      .select("id,title,start_at")
      .eq("user_id", user.id)
      .eq("event_type", "quiz")
      .eq("enabled", true)
      .gte("start_at", now.toISOString())
      .lte("start_at", soon.toISOString())
      .limit(100);
    if (error) throw new Error(error.message);

    for (const event of events || []) {
      const key = "quiz_upcoming:" + event.id;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      pending.push({
        user_id: user.id,
        type: "quiz_upcoming",
        title: "Quiz coming up",
        message: event.title + " starts within 24 hours.",
        href: "/calendar",
        metadata: { source_type: "calendar_event", source_id: event.id, start_at: event.start_at },
      });
    }
  }

  if (pending.length) {
    const { error } = await supabase.from("notifications").insert(pending);
    if (error) throw new Error(error.message);
  }
  return pending.length;
}

export async function getUnreadNotificationCount() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    throw new Error(error.message);
  }

  return count || 0;
}

export async function createNotification(input: {
  type: NotificationType;
  title: string;
  message?: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: user.id,
      type: input.type,
      title: input.title,
      message: input.message || "",
      href: input.href || null,
      metadata: input.metadata || {},
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Notification;
}

export async function markNotificationRead(
  id: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("notifications")
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Notification;
}

export async function markAllNotificationsRead() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { error } = await supabase
    .from("notifications")
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function deleteNotification(
  id: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

/**
 * Subscribe to the signed-in user's notification changes. Call the returned
 * cleanup function when the owning component unmounts. Polling can remain as
 * a fallback if Realtime is not enabled for the table in Supabase.
 */
export async function subscribeToNotifications(onChange: () => void) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return () => undefined;

  // More than one UI component can subscribe for the same user (for example,
  // the notification menu and its unread-count badge). Supabase reuses channels
  // by name, so a shared name can return an already-subscribed channel and make
  // a later .on(...) throw. Give each independent subscription its own channel.
  const channelName =
    "studyspace-notifications-" +
    user.id +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2);
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: "user_id=eq." + user.id,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
