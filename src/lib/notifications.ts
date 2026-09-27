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