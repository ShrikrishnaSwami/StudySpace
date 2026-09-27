"use client";

import {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/lib/notifications";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

type UserInfo = {
  id: string;
  email: string;
  name: string;
};

const mainNavigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "AI Tutor",
    href: "/ai-tutor",
    icon: Brain,
  },
  {
    label: "Courses",
    href: "/courses",
    icon: BookOpen,
  },
  {
    label: "Assignments",
    href: "/assignments",
    icon: ClipboardList,
  },
  {
    label: "Quizzes",
    href: "/quizzes",
    icon: CheckSquare,
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Homework",
    href: "/homework-uploader",
    icon: Upload,
  },
];

const bottomNavigation = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

function notificationIcon(
  type: Notification["type"]
) {
  switch (type) {
    case "assignment_due":
    case "assignment_overdue":
      return ClipboardList;

    case "quiz_upcoming":
    case "quiz_result":
      return CheckSquare;

    case "study_reminder":
      return CalendarDays;

    case "calendar_conflict":
      return CalendarDays;

    case "ai_recommendation":
      return Sparkles;

    default:
      return Bell;
  }
}

function relativeTime(dateString: string) {
  const date = new Date(dateString);
  const difference =
    Date.now() - date.getTime();

  const seconds = Math.floor(
    difference / 1000
  );

  if (seconds < 30) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    "en-CA",
    {
      month: "short",
      day: "numeric",
    }
  );
}

function NotificationDropdown({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const [
          notificationData,
          unread,
        ] = await Promise.all([
          getNotifications(8),
          getUnreadNotificationCount(),
        ]);

        if (!isMounted) {
          return;
        }

        setNotifications(
          notificationData
        );

        setUnreadCount(unread);
      } catch (error) {
        console.error(
          "Failed to load notifications:",
          error
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    const interval =
      window.setInterval(() => {
        void loadNotifications();
      }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

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

      onClose();

      if (notification.href) {
        router.push(
          notification.href
        );
      }
    } catch (error) {
      console.error(
        "Failed to open notification:",
        error
      );
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          read_at:
            new Date().toISOString(),
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
    <div className="absolute right-0 top-12 z-[100] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#110d1b] shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Notifications
          </h3>

          <p className="mt-0.5 text-[11px] text-white/30">
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
              className="rounded-lg px-2.5 py-1.5 text-[11px] text-violet-300 transition hover:bg-violet-500/10"
            >
              Mark all read
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/5 hover:text-white"
            aria-label="Close notifications"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center px-6 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
              <Bell
                size={20}
                className="text-white/25"
              />
            </div>

            <p className="text-sm font-medium text-white/70">
              No notifications
            </p>

            <p className="mt-1 text-xs text-white/30">
              You&apos;re all caught up.
            </p>
          </div>
        ) : (
          notifications.map(
            (notification) => {
              const Icon =
                notificationIcon(
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
                  className={[
                    "flex w-full gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition hover:bg-white/[0.035]",
                    !notification.read
                      ? "bg-violet-500/[0.045]"
                      : "",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      !notification.read
                        ? "bg-violet-500/15 text-violet-300"
                        : "bg-white/[0.04] text-white/30",
                    ].join(" ")}
                  >
                    <Icon size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={[
                          "text-xs font-semibold",
                          !notification.read
                            ? "text-white"
                            : "text-white/65",
                        ].join(" ")}
                      >
                        {
                          notification.title
                        }
                      </p>

                      {!notification.read && (
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/35">
                      {
                        notification.message
                      }
                    </p>

                    <p className="mt-1.5 text-[10px] text-white/20">
                      {relativeTime(
                        notification.created_at
                      )}
                    </p>
                  </div>
                </button>
              );
            }
          )
        )}
      </div>

      <div className="border-t border-white/[0.07] p-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push(
              "/notifications"
            );
          }}
          className="w-full rounded-xl px-3 py-2 text-xs font-medium text-violet-300 transition hover:bg-violet-500/10"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}

function NotificationButton() {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const [open, setOpen] =
    useState(false);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const loadCount = useCallback(
    async () => {
      try {
        const count =
          await getUnreadNotificationCount();

        setUnreadCount(count);
      } catch (error) {
        console.error(
          "Failed to load notification count:",
          error
        );
      }
    },
    []
  );

  useEffect(() => {
    let active = true;

    const refreshCount = async () => {
      try {
        const count =
          await getUnreadNotificationCount();

        if (active) {
          setUnreadCount(count);
        }
      } catch (error) {
        console.error(
          "Failed to load notification count:",
          error
        );
      }
    };

    void refreshCount();

    const interval =
      window.setInterval(() => {
        void refreshCount();
      }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen((value) => !value)
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/50 transition hover:bg-white/[0.05] hover:text-white"
        aria-label="Notifications"
      >
        <Bell size={17} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[17px] items-center justify-center rounded-full border-2 border-[#080611] bg-violet-500 px-1 text-[9px] font-bold leading-[13px] text-white">
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          onClose={() =>
            setOpen(false)
          }
        />
      )}
    </div>
  );
}

export default function AppShell({
  children,
  title,
  description,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [collapsed, setCollapsed] =
    useState(false);

  const [user, setUser] =
    useState<UserInfo | null>(null);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const email =
        user.email || "";

      const metadata =
        user.user_metadata as {
          full_name?: string;
          name?: string;
        };

      const name =
        metadata.full_name ||
        metadata.name ||
        email.split("@")[0] ||
        "Student";

      setUser({
        id: user.id,
        email,
        name,
      });

      setIsAdmin(
        isAdminEmail(email)
      );

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!session?.user) {
            router.replace("/login");
            return;
          }

          const authUser =
            session.user;

          const email =
            authUser.email || "";

          const metadata =
            authUser.user_metadata as {
              full_name?: string;
              name?: string;
            };

          const name =
            metadata.full_name ||
            metadata.name ||
            email.split("@")[0] ||
            "Student";

          setUser({
            id: authUser.id,
            email,
            name,
          });

          setIsAdmin(
            isAdminEmail(email)
          );

          setLoading(false);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080611]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10">
            <GraduationCap
              size={24}
              className="text-violet-400"
            />
          </div>

          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-violet-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080611] text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.07] bg-[#0b0813]/95 backdrop-blur-xl transition-all duration-300",
          collapsed
            ? "w-[78px]"
            : "w-[260px]",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="flex h-[76px] items-center border-b border-white/[0.07] px-4">
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/20">
              <GraduationCap
                size={22}
                className="text-white"
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[17px] font-bold tracking-tight">
                  StudySpace
                </div>

                <div className="truncate text-[10px] uppercase tracking-[0.18em] text-white/30">
                  Student workspace
                </div>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="ml-auto rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {!collapsed && (
            <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
              Workspace
            </div>
          )}

          <nav className="space-y-1">
            {mainNavigation.map(
              (item) => {
                const Icon =
                  item.icon;

                const active =
                  isActive(
                    item.href
                  );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                    className={[
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                      active
                        ? "bg-violet-500/15 text-violet-300 shadow-[inset_2px_0_0_#8b5cf6]"
                        : "text-white/50 hover:bg-white/[0.04] hover:text-white",
                    ].join(" ")}
                  >
                    <Icon
                      size={18}
                      className={[
                        "shrink-0 transition-colors",
                        active
                          ? "text-violet-400"
                          : "text-white/35 group-hover:text-white/70",
                      ].join(" ")}
                    />

                    {!collapsed && (
                      <span className="truncate">
                        {item.label}
                      </span>
                    )}

                    {!collapsed &&
                      active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                      )}
                  </Link>
                );
              }
            )}
          </nav>

          {/* Admin */}
          {isAdmin && (
            <div className="mt-7">
              {!collapsed && (
                <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                  Administration
                </div>
              )}

              <Link
                href="/admin"
                onClick={() => setSidebarOpen(false)}
                title={
                  collapsed
                    ? "Admin"
                    : undefined
                }
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                  isActive("/admin")
                    ? "bg-violet-500/15 text-violet-300 shadow-[inset_2px_0_0_#8b5cf6]"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white",
                ].join(" ")}
              >
                <Sparkles
                  size={18}
                  className="shrink-0 text-violet-400"
                />

                {!collapsed && (
                  <span>
                    Admin
                  </span>
                )}
              </Link>
            </div>
          )}

          {/* Account */}
          <div className="mt-7">
            {!collapsed && (
              <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                Account
              </div>
            )}

            <nav className="space-y-1">
              {bottomNavigation.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const active =
                    isActive(
                      item.href
                    );

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={
                        collapsed
                          ? item.label
                          : undefined
                      }
                      className={[
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                        active
                          ? "bg-violet-500/15 text-violet-300 shadow-[inset_2px_0_0_#8b5cf6]"
                          : "text-white/50 hover:bg-white/[0.04] hover:text-white",
                      ].join(" ")}
                    >
                      <Icon
                        size={18}
                        className="shrink-0"
                      />

                      {!collapsed && (
                        <span>
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                }
              )}
            </nav>
          </div>
        </div>

        {/* User */}
        <div className="border-t border-white/[0.07] p-3">
          <div
            className={[
              "flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5",
              collapsed
                ? "justify-center"
                : "",
            ].join(" ")}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-700 text-xs font-bold">
              {user?.name
                ?.charAt(0)
                .toUpperCase() ||
                "S"}
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white/85">
                  {user?.name}
                </div>

                <div className="truncate text-[11px] text-white/30">
                  {user?.email}
                </div>
              </div>
            )}

            {!collapsed && (
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="rounded-lg p-2 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Collapse */}
        <button
          type="button"
          onClick={() =>
            setCollapsed(
              (value) => !value
            )
          }
          className="absolute -right-3 top-[88px] hidden h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#151021] text-white/50 shadow-lg hover:text-white lg:flex"
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          {collapsed ? (
            <ChevronRight
              size={14}
            />
          ) : (
            <ChevronLeft
              size={14}
            />
          )}
        </button>
      </aside>

      {/* Main */}
      <div
        className={[
          "min-h-screen transition-all duration-300",
          collapsed
            ? "lg:pl-[78px]"
            : "lg:pl-[260px]",
        ].join(" ")}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-white/[0.07] bg-[#080611]/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 text-white/60 hover:text-white lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                {title ||
                  "StudySpace"}
              </h1>

              {description && (
                <p className="mt-0.5 hidden truncate text-xs text-white/35 sm:block">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationButton />

            <Link
              href="/settings"
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/45 transition hover:bg-white/[0.05] hover:text-white sm:flex"
              title="Settings"
            >
              <Settings size={17} />
            </Link>

            <Link
              href="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-700 text-xs font-bold shadow-lg shadow-violet-500/10"
              title={
                user?.name ||
                "Profile"
              }
            >
              {user?.name
                ?.charAt(0)
                .toUpperCase() ||
                "S"}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="min-h-[calc(100vh-76px)]">
          {children}
        </main>
      </div>
    </div>
  );
}