"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock3,
  FileText,
  GraduationCap,
  Lightbulb,
  CalendarDays,
  AlertTriangle,
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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString(
    "en-CA",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);

      const data = await getNotifications(100);

      setNotifications(data);
    } catch (error) {
      console.error(
        "Failed to load notifications:",
        error
      );
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

        if (!active) return;

        setNotifications(data);
      } catch (error) {
        console.error(
          "Failed to load notifications:",
          error
        );
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

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  async function markRead(
    notification: Notification
  ) {
    try {
      if (!notification.read) {
        await markNotificationRead(
          notification.id
        );

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read: true,
                  read_at:
                    new Date().toISOString(),
                }
              : item
          )
        );
      }

      if (notification.href) {
        router.push(notification.href);
      }
    } catch (error) {
      console.error(
        "Failed to mark notification:",
        error
      );
    }
  }

  async function markAllRead() {
    try {
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
      console.error(
        "Failed to mark all notifications:",
        error
      );
    }
  }

  async function remove(
    notification: Notification
  ) {
    try {
      await deleteNotification(
        notification.id
      );

      setNotifications((current) =>
        current.filter(
          (item) =>
            item.id !== notification.id
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete notification:",
        error
      );
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
              Activity
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Notifications
            </h1>

            <p className="mt-2 text-sm text-white/45">
              Stay up to date with everything
              happening in StudySpace.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            >
              <CheckCheck size={16} />

              Mark all as read
            </button>
          )}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />

              <p className="mt-4 text-sm text-white/40">
                Loading notifications...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                <Bell
                  size={24}
                  className="text-violet-400"
                />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">
                You&apos;re all caught up
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
                When assignments, quizzes, calendar
                conflicts, or AI recommendations need
                your attention, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map(
                (notification) => {
                  const Icon = getIcon(
                    notification.type
                  );

                  return (
                    <div
                      key={notification.id}
                      className={`group flex gap-4 border-b border-white/[0.06] p-5 last:border-b-0 ${
                        notification.read
                          ? ""
                          : "bg-violet-500/[0.04]"
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          notification.read
                            ? "bg-white/[0.05] text-white/40"
                            : "bg-violet-500/15 text-violet-300"
                        }`}
                      >
                        <Icon size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              markRead(
                                notification
                              )
                            }
                            className="text-left"
                          >
                            <div className="flex items-center gap-2">
                              <h3
                                className={`text-sm ${
                                  notification.read
                                    ? "font-medium text-white/70"
                                    : "font-semibold text-white"
                                }`}
                              >
                                {
                                  notification.title
                                }
                              </h3>

                              {!notification.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                              )}
                            </div>

                            {notification.message && (
                              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">
                                {
                                  notification.message
                                }
                              </p>
                            )}
                          </button>

                          <span className="shrink-0 text-xs text-white/25">
                            {formatDate(
                              notification.created_at
                            )}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={() =>
                                markRead(
                                  notification
                                )
                              }
                              className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20"
                            >
                              Mark as read
                            </button>
                          )}

                          {notification.href && (
                            <button
                              type="button"
                              onClick={() =>
                                markRead(
                                  notification
                                )
                              }
                              className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/50 transition hover:bg-white/[0.08] hover:text-white"
                            >
                              Open
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              remove(
                                notification
                              )
                            }
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
                            aria-label="Delete notification"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}