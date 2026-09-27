"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  GraduationCap,
  Lightbulb,
  CalendarDays,
  AlertTriangle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
  type NotificationType,
} from "@/lib/notifications";

function getNotificationIcon(type: NotificationType) {
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

function formatTime(dateString: string) {
  const date = new Date(dateString);

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export default function NotificationCenter() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    try {
      setLoading(true);

      const [items, count] = await Promise.all([
        getNotifications(50),
        getUnreadNotificationCount(),
      ]);

      setNotifications(items);
      setUnreadCount(count);
    } catch (error) {
      console.error(
        "Failed to load notifications:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [open]);

  async function handleNotificationClick(
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

        setUnreadCount((current) =>
          Math.max(0, current - 1)
        );
      }

      setOpen(false);

      if (notification.href) {
        router.push(notification.href);
      }
    } catch (error) {
      console.error(
        "Failed to open notification:",
        error
      );
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) {
      return;
    }

    try {
      await markAllNotificationsRead();

      const timestamp =
        new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
          read_at: timestamp,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Failed to mark notifications read:",
        error
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);

          if (!open) {
            loadNotifications();
          }
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/65 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
        aria-label="Notifications"
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full border-2 border-[#0b0713] bg-violet-500 px-1 text-[10px] font-bold leading-4 text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[100] w-[390px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/10 bg-[#100b1b]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Notifications
              </h3>

              <p className="mt-0.5 text-xs text-white/40">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-violet-300 transition hover:bg-violet-500/10 hover:text-violet-200"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />

                <p className="mt-3 text-xs text-white/40">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                  <Bell
                    size={21}
                    className="text-violet-400"
                  />
                </div>

                <h4 className="mt-4 text-sm font-medium text-white">
                  No notifications
                </h4>

                <p className="mt-1 text-xs text-white/40">
                  Important updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon =
                  getNotificationIcon(
                    notification.type
                  );

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() =>
                      handleNotificationClick(
                        notification
                      )
                    }
                    className={`group flex w-full gap-3 border-b border-white/[0.06] px-4 py-3.5 text-left transition hover:bg-white/[0.04] ${
                      notification.read
                        ? ""
                        : "bg-violet-500/[0.045]"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        notification.read
                          ? "bg-white/[0.05] text-white/40"
                          : "bg-violet-500/15 text-violet-300"
                      }`}
                    >
                      <Icon size={17} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`text-sm ${
                            notification.read
                              ? "font-medium text-white/70"
                              : "font-semibold text-white"
                          }`}
                        >
                          {notification.title}
                        </p>

                        {!notification.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                        )}
                      </div>

                      {notification.message && (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">
                          {notification.message}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/30">
                        <Clock3 size={11} />

                        {formatTime(
                          notification.created_at
                        )}
                      </div>
                    </div>

                    {!notification.read && (
                      <div className="hidden items-center group-hover:flex">
                        <Check
                          size={14}
                          className="text-white/30"
                        />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/notifications");
                }}
                className="w-full rounded-lg py-2 text-center text-xs font-medium text-violet-300 transition hover:bg-violet-500/10 hover:text-violet-200"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}