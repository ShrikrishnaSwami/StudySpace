"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  GraduationCap,
  Lightbulb,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";

import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
  type NotificationType,
} from "@/lib/notifications";

type Filter = "all" | "unread" | "read";

function getIcon(type: NotificationType) {
  switch (type) {
    case "assignment_due":
      return FileText;
    case "assignment_overdue":
      return AlertTriangle;
    case "quiz_upcoming":
    case "quiz_result":
      return GraduationCap;
    case "study_reminder":
      return Clock3;
    case "calendar_conflict":
      return CalendarDays;
    case "ai_recommendation":
      return Lightbulb;
    default:
      return Bell;
  }
}

function getTypeLabel(type: NotificationType) {
  switch (type) {
    case "assignment_due":
      return "Assignment";
    case "assignment_overdue":
      return "Overdue";
    case "quiz_upcoming":
      return "Quiz";
    case "quiz_result":
      return "Quiz result";
    case "study_reminder":
      return "Study reminder";
    case "calendar_conflict":
      return "Calendar";
    case "ai_recommendation":
      return "AI recommendation";
    default:
      return "System";
  }
}

function getTypeClasses(type: NotificationType, read: boolean) {
  if (read) {
    return "bg-white/[0.045] text-white/45";
  }

  switch (type) {
    case "assignment_overdue":
      return "bg-red-500/10 text-red-300";
    case "calendar_conflict":
      return "bg-amber-500/10 text-amber-300";
    case "ai_recommendation":
      return "bg-violet-500/10 text-violet-300";
    case "quiz_result":
      return "bg-emerald-500/10 text-emerald-300";
    default:
      return "bg-violet-500/10 text-violet-300";
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const diff = now.getTime() - date.getTime();

  if (diff >= 0 && diff < 60_000) {
    return "Just now";
  }

  if (diff >= 60_000 && diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000);
    return `${minutes}m ago`;
  }

  if (diff >= 3_600_000 && diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return `${hours}h ago`;
  }

  if (diff >= 86_400_000 && diff < 7 * 86_400_000) {
    const days = Math.floor(diff / 86_400_000);
    return `${days}d ago`;
  }

  return date.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== now.getFullYear()
        ? "numeric"
        : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(100);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const runLoad = async () => {
      try {
        setLoading(true);

        const data = await getNotifications(100);

        if (active) {
          setNotifications(data);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    runLoad();

    return () => {
      active = false;
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      if (filter === "unread" && notification.read) {
        return false;
      }

      if (filter === "read" && !notification.read) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query) ||
        getTypeLabel(notification.type)
          .toLowerCase()
          .includes(query)
      );
    });
  }, [notifications, filter, search]);

  async function markRead(notification: Notification) {
    try {
      setWorkingId(notification.id);

      if (!notification.read) {
        await markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read: true,
                  read_at: new Date().toISOString(),
                }
              : item
          )
        );
      }

      if (notification.href) {
        router.push(notification.href);
      }
    } catch (error) {
      console.error("Failed to mark notification:", error);
    } finally {
      setWorkingId(null);
    }
  }

  async function markAllRead() {
    try {
      setMarkingAll(true);

      await markAllNotificationsRead();

      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
          read_at: now,
        }))
      );
    } catch (error) {
      console.error("Failed to mark all notifications:", error);
    } finally {
      setMarkingAll(false);
    }
  }

  async function remove(notification: Notification) {
    try {
      setWorkingId(notification.id);

      await deleteNotification(notification.id);

      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id)
      );

      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-600/[0.09] blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-500/[0.06] blur-3xl" />

          <div className="relative px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-violet-300/80">
                  <Bell size={14} />
                  Activity center
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Notifications
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
                  Keep track of assignments, quizzes, study reminders,
                  calendar conflicts, and recommendations.
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-200 transition hover:border-violet-400/30 hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {markingAll ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCheck size={16} />
                  )}
                  Mark all as read
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
              <div className="bg-black/20 px-4 py-4">
                <p className="text-xs text-white/35">Total</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {notifications.length}
                </p>
              </div>

              <div className="bg-black/20 px-4 py-4">
                <p className="text-xs text-white/35">Unread</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xl font-semibold text-violet-200">
                    {unreadCount}
                  </p>
                  {unreadCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  )}
                </div>
              </div>

              <div className="col-span-2 bg-black/20 px-4 py-4 sm:col-span-1">
                <p className="text-xs text-white/35">Read</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {readCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <section className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
              aria-label="Search notifications"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-violet-400/30 focus:bg-white/[0.04] focus:ring-2 focus:ring-violet-500/10"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-white/30 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
            {(["all", "unread", "read"] as Filter[]).map((value) => {
              const active = filter === value;

              const label =
                value === "all"
                  ? "All"
                  : value === "unread"
                    ? "Unread"
                    : "Read";

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                    active
                      ? "bg-white/[0.09] text-white shadow-sm"
                      : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                  }`}
                >
                  {label}
                  {value === "unread" && unreadCount > 0 && (
                    <span className="ml-1.5 text-violet-300">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Notification list */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          {loading ? (
            <div className="divide-y divide-white/[0.06]">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex gap-4 px-4 py-5 sm:px-6"
                >
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-white/[0.06]" />

                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-48 animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-3 h-3 w-full max-w-xl animate-pulse rounded bg-white/[0.045]" />
                    <div className="mt-2 h-3 w-2/3 max-w-md animate-pulse rounded bg-white/[0.035]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                {search || filter !== "all" ? (
                  <Search size={25} className="text-white/30" />
                ) : (
                  <CheckCheck size={25} className="text-violet-300/70" />
                )}
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">
                {search || filter !== "all"
                  ? "No notifications found"
                  : "You're all caught up"}
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
                {search || filter !== "all"
                  ? "Try changing your search or notification filter."
                  : "New activity from assignments, quizzes, your calendar, and StudySpace recommendations will appear here."}
              </p>

              {(search || filter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div>
              {filteredNotifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const isWorking = workingId === notification.id;

                return (
                  <article
                    key={notification.id}
                    className={`group relative border-b border-white/[0.06] last:border-b-0 transition ${
                      notification.read
                        ? "hover:bg-white/[0.018]"
                        : "bg-violet-500/[0.035] hover:bg-violet-500/[0.055]"
                    }`}
                  >
                    {!notification.read && (
                      <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-violet-400" />
                    )}

                    <div className="flex gap-3.5 px-4 py-5 sm:gap-4 sm:px-6">
                      {/* Icon */}
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${getTypeClasses(
                          notification.type,
                          notification.read
                        )}`}
                      >
                        <Icon size={18} />
                      </div>

                      {/* Main */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <button
                            type="button"
                            onClick={() => markRead(notification)}
                            disabled={isWorking}
                            className="min-w-0 text-left disabled:cursor-wait"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                className={`text-sm ${
                                  notification.read
                                    ? "font-medium text-white/70"
                                    : "font-semibold text-white"
                                }`}
                              >
                                {notification.title}
                              </h2>

                              {!notification.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                              )}
                            </div>

                            {notification.message && (
                              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-white/40">
                                {notification.message}
                              </p>
                            )}
                          </button>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[11px] font-medium text-white/35">
                              {getTypeLabel(notification.type)}
                            </span>

                            <span className="text-xs text-white/25">
                              {formatDate(notification.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={() => markRead(notification)}
                              disabled={isWorking}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/15 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:border-violet-400/25 hover:bg-violet-500/15 disabled:opacity-50"
                            >
                              {isWorking ? (
                                <Loader2
                                  size={13}
                                  className="animate-spin"
                                />
                              ) : (
                                <Check size={13} />
                              )}
                              Mark as read
                            </button>
                          )}

                          {notification.href && (
                            <button
                              type="button"
                              onClick={() => markRead(notification)}
                              disabled={isWorking}
                              className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-xs font-medium text-white/45 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                            >
                              Open
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeletingId(notification.id)}
                            disabled={isWorking}
                            aria-label={`Delete ${notification.title}`}
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/20 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {!loading && filteredNotifications.length > 0 && (
          <p className="mt-4 text-center text-xs text-white/25">
            Showing {filteredNotifications.length} of {notifications.length}{" "}
            notifications
          </p>
        )}
      </div>

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-notification-title"
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#15131d] p-6 shadow-2xl shadow-black/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
              <Trash2 size={19} />
            </div>

            <h2
              id="delete-notification-title"
              className="mt-5 text-lg font-semibold text-white"
            >
              Delete notification?
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/40">
              This notification will be permanently removed from your
              activity center.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  const notification = notifications.find(
                    (item) => item.id === deletingId
                  );

                  if (notification) {
                    remove(notification);
                  }
                }}
                disabled={workingId === deletingId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {workingId === deletingId && (
                  <Loader2 size={15} className="animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}