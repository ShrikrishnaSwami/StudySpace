"use client";

import {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
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
    badge: "AI",
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

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "assignment_due":
    case "assignment_overdue":
      return ClipboardList;

    case "quiz_upcoming":
    case "quiz_result":
      return CheckSquare;

    case "study_reminder":
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
  const difference = Math.max(0, Date.now() - date.getTime());

  const seconds = Math.floor(difference / 1000);

  if (seconds < 30) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function NotificationDropdown({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      try {
        const [notificationData, unread] = await Promise.all([
          getNotifications(8),
          getUnreadNotificationCount(),
        ]);

        if (!mounted) {
          return;
        }

        setNotifications(notificationData);
        setUnreadCount(unread);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  async function handleNotificationClick(
    notification: Notification
  ) {
    try {
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

        setUnreadCount((current) => Math.max(0, current - 1));
      }

      onClose();

      if (notification.href) {
        router.push(notification.href);
      }
    } catch (error) {
      console.error("Failed to open notification:", error);
    }
  }

  async function handleMarkAllRead() {
    if (markingAll || unreadCount === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      await markAllNotificationsRead();

      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          read_at: now,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark notifications read:", error);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="absolute right-0 top-12 z-[100] w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#100c19]/98 shadow-2xl shadow-black/60 backdrop-blur-2xl">
      {/* Header */}
      <div className="border-b border-white/[0.07] px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Notifications
              </h3>

              {unreadCount > 0 && (
                <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold text-violet-300">
                  {unreadCount}
                </span>
              )}
            </div>

            <p className="mt-0.5 text-[11px] text-white/30">
              {unreadCount > 0
                ? "You have new activity"
                : "You're all caught up"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-violet-300 transition hover:bg-violet-500/10 disabled:opacity-50"
              >
                <Check size={12} />
                {markingAll ? "Marking..." : "Mark all read"}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="max-h-[430px] overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-xl px-2 py-3"
              >
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-white/[0.06]" />

                <div className="min-w-0 flex-1">
                  <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
                  <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-white/[0.04]" />
                  <div className="mt-1.5 h-2.5 w-2/3 animate-pulse rounded bg-white/[0.03]" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035]">
              <Bell size={19} className="text-white/25" />
            </div>

            <p className="mt-4 text-sm font-medium text-white/70">
              Nothing new
            </p>

            <p className="mt-1 max-w-[220px] text-xs leading-5 text-white/30">
              Important activity from your workspace will appear here.
            </p>
          </div>
        ) : (
          <div className="p-2">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`group flex w-full gap-3 rounded-xl px-3 py-3 text-left transition ${
                    !notification.read
                      ? "bg-violet-500/[0.055] hover:bg-violet-500/[0.09]"
                      : "hover:bg-white/[0.035]"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      !notification.read
                        ? "bg-violet-500/15 text-violet-300"
                        : "bg-white/[0.045] text-white/30"
                    }`}
                  >
                    <Icon size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`line-clamp-1 text-xs font-semibold ${
                          notification.read
                            ? "text-white/60"
                            : "text-white"
                        }`}
                      >
                        {notification.title}
                      </p>

                      {!notification.read && (
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                      )}
                    </div>

                    {notification.message && (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/35">
                        {notification.message}
                      </p>
                    )}

                    <p className="mt-1.5 text-[10px] text-white/20">
                      {relativeTime(notification.created_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.07] p-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/notifications");
          }}
          className="w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/10"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}

function NotificationButton() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load notification count:", error);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadCount();
    }, 0);

    const interval = window.setInterval(() => {
      void loadCount();
    }, 30000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadCount]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        aria-expanded={open}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition ${
          open
            ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
            : "border-white/[0.07] bg-white/[0.025] text-white/50 hover:bg-white/[0.05] hover:text-white"
        }`}
      >
        <Bell size={17} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full border-2 border-[#080611] bg-violet-500 px-1 text-[9px] font-bold leading-[13px] text-white shadow-lg shadow-violet-500/20">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function NavigationLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: {
    label: string;
    href: string;
    icon: typeof Home;
    badge?: string;
  };
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
        active
          ? "bg-violet-500/[0.13] text-violet-200"
          : "text-white/45 hover:bg-white/[0.04] hover:text-white"
      } ${collapsed ? "justify-center" : ""}`}
    >
      {active && (
        <span className="absolute bottom-2.5 left-0 top-2.5 w-0.5 rounded-r-full bg-violet-400" />
      )}

      <Icon
        size={18}
        className={`shrink-0 transition-colors ${
          active
            ? "text-violet-400"
            : "text-white/30 group-hover:text-white/65"
        }`}
      />

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate font-medium">
            {item.label}
          </span>

          {item.badge && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                active
                  ? "bg-violet-400/15 text-violet-300"
                  : "bg-white/[0.05] text-white/25"
              }`}
            >
              {item.badge}
            </span>
          )}

          {active && !item.badge && (
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_7px_rgba(139,92,246,0.7)]" />
          )}
        </>
      )}
    </Link>
  );
}

export default function AppShell({
  children,
  title,
  description,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" &&
    window.localStorage.getItem("studyspace-sidebar-collapsed") === "true"
  );
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.localStorage.setItem(
      "studyspace-sidebar-collapsed",
      String(collapsed)
    );
  }, [collapsed]);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!authUser) {
        router.replace("/login");
        return;
      }

      updateUser(authUser);
    }

    function updateUser(authUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }) {
      const email = authUser.email || "";

      const metadata = authUser.user_metadata as {
        full_name?: string;
        name?: string;
      };

      const name =
        metadata?.full_name ||
        metadata?.name ||
        email.split("@")[0] ||
        "Student";

      setUser({
        id: authUser.id,
        email,
        name,
      });

      setIsAdmin(isAdminEmail(email));
      setLoading(false);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      updateUser(session.user);
    });

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
      pathname.startsWith(`${href}/`)
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080611]">
        <div className="flex flex-col items-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 shadow-xl shadow-violet-500/10">
            <div className="absolute inset-0 rounded-2xl bg-violet-500/10 blur-xl" />

            <GraduationCap
              size={25}
              className="relative text-violet-300"
            />
          </div>

          <div className="mt-5 h-1 w-20 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-violet-500" />
          </div>

          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/20">
            StudySpace
          </p>
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
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.07] bg-[#0b0813]/95 shadow-2xl shadow-black/20 backdrop-blur-2xl transition-all duration-300 ${
          collapsed ? "w-[76px]" : "w-[252px]"
        } ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="flex h-[76px] items-center border-b border-white/[0.07] px-4">
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`group flex min-w-0 items-center ${
              collapsed ? "mx-auto" : "gap-3"
            }`}
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/20">
              <div className="absolute inset-0 rounded-xl bg-violet-400/20 blur-md" />

              <GraduationCap
                size={21}
                className="relative text-white"
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[17px] font-bold tracking-tight text-white">
                  StudySpace
                </div>

                <div className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-[0.18em] text-white/25">
                  Student workspace
                </div>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-2 text-white/35 transition hover:bg-white/[0.05] hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {!collapsed && (
            <div className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
              Workspace
            </div>
          )}

          <nav className="space-y-1">
            {mainNavigation.map((item) => (
              <NavigationLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                collapsed={collapsed}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          {/* Admin */}
          {isAdmin && (
            <div className="mt-7">
              {!collapsed && (
                <div className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
                  Administration
                </div>
              )}

              <Link
                href="/admin"
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? "Admin" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive("/admin")
                    ? "bg-violet-500/[0.13] text-violet-200"
                    : "text-white/45 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {isActive("/admin") && (
                  <span className="absolute bottom-2.5 left-0 top-2.5 w-0.5 rounded-r-full bg-violet-400" />
                )}

                <Sparkles
                  size={18}
                  className="shrink-0 text-violet-400"
                />

                {!collapsed && (
                  <span className="font-medium">Admin</span>
                )}
              </Link>
            </div>
          )}

          {/* Account */}
          <div className="mt-7">
            {!collapsed && (
              <div className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
                Account
              </div>
            )}

            <nav className="space-y-1">
              {bottomNavigation.map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </nav>
          </div>
        </div>

        {/* User */}
        <div className="border-t border-white/[0.07] p-3">
          <div
            className={`flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Link
              href="/settings"
              title={collapsed ? user?.name : undefined}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-700 text-xs font-bold shadow-lg shadow-violet-500/10"
            >
              {user?.name?.charAt(0).toUpperCase() || "S"}
            </Link>

            {!collapsed && (
              <>
                <Link
                  href="/settings"
                  className="min-w-0 flex-1"
                >
                  <div className="truncate text-sm font-medium text-white/85 transition hover:text-white">
                    {user?.name}
                  </div>

                  <div className="mt-0.5 truncate text-[10px] text-white/25">
                    {user?.email}
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="rounded-lg p-2 text-white/25 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapse button */}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={
            collapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          title={
            collapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          className="absolute -right-3 top-[86px] hidden h-7 w-7 items-center justify-center rounded-full border border-white/[0.1] bg-[#151021] text-white/45 shadow-xl transition hover:border-violet-400/20 hover:text-white lg:flex"
        >
          {collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>
      </aside>

      {/* Main */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-[252px]"
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-white/[0.07] bg-[#080611]/80 px-4 backdrop-blur-2xl sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/55 transition hover:bg-white/[0.05] hover:text-white lg:hidden"
            >
              <Menu size={19} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {title || "StudySpace"}
                </h1>

                {pathname === "/ai-tutor" && (
                  <span className="hidden rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-300 sm:inline-block">
                    AI
                  </span>
                )}
              </div>

              {description && (
                <p className="mt-0.5 hidden max-w-xl truncate text-xs text-white/30 sm:block">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationButton />

            <Link
              href="/settings"
              title="Settings"
              className={`hidden h-10 w-10 items-center justify-center rounded-xl border transition sm:flex ${
                pathname === "/settings"
                  ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                  : "border-white/[0.07] bg-white/[0.025] text-white/40 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <Settings size={17} />
            </Link>

            <Link
              href="/settings"
              title={user?.name || "Profile"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-700 text-xs font-bold shadow-lg shadow-violet-500/10 ring-2 ring-transparent transition hover:ring-violet-400/20"
            >
              {user?.name?.charAt(0).toUpperCase() || "S"}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-76px)]">
          {children}
        </main>
      </div>
    </div>
  );
}