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

function notificationIcon(type: Notification["type"]) {
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
  const difference = Date.now() - date.getTime();

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

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

function NotificationDropdown({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      try {
        const [notificationData, unread] = await Promise.all([
          getNotifications(8),
          getUnreadNotificationCount(),
        ]);

        if (!mounted) return;

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

  async function handleNotificationClick(notification: Notification) {
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
    try {
      await markAllNotificationsRead();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          read_at: new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark notifications read:", error);
    }
  }

  return (
    <div className="absolute right-0 top-12 z-[100] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden border border-white/[0.1] bg-[#17151c] shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
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
              className="px-2 py-1.5 text-[11px] font-medium text-white/45 transition hover:text-white"
            >
              Mark all read
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/30 transition hover:text-white"
            aria-label="Close notifications"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center px-6 py-12">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bell
              size={20}
              className="mx-auto text-white/20"
            />

            <p className="mt-3 text-sm font-medium text-white/60">
              Nothing new
            </p>

            <p className="mt-1 text-xs text-white/25">
              You&apos;re all caught up.
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = notificationIcon(notification.type);

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() =>
                  handleNotificationClick(notification)
                }
                className={[
                  "flex w-full gap-3 border-b border-white/[0.06] px-4 py-3.5 text-left transition",
                  "hover:bg-white/[0.035]",
                  !notification.read
                    ? "bg-white/[0.025]"
                    : "",
                ].join(" ")}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-white/[0.07] bg-white/[0.03] text-white/35">
                  <Icon size={15} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={[
                        "line-clamp-1 text-xs font-semibold",
                        notification.read
                          ? "text-white/60"
                          : "text-white",
                      ].join(" ")}
                    >
                      {notification.title}
                    </p>

                    {!notification.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                    )}
                  </div>

                  {notification.message && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/30">
                      {notification.message}
                    </p>
                  )}

                  <p className="mt-1.5 text-[10px] text-white/20">
                    {relativeTime(notification.created_at)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.08] p-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/notifications");
          }}
          className="w-full px-3 py-2.5 text-xs font-medium text-white/40 transition hover:bg-white/[0.04] hover:text-white/70"
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
      console.error(
        "Failed to load notification count:",
        error
      );
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
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        aria-expanded={open}
        className={[
          "relative flex h-9 w-9 items-center justify-center border transition",
          open
            ? "border-white/[0.15] bg-white/[0.07] text-white"
            : "border-white/[0.08] bg-transparent text-white/40 hover:bg-white/[0.04] hover:text-white/75",
        ].join(" ")}
      >
        <Bell size={17} />

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-[16px] items-center justify-center border border-[#111016] bg-white px-1 text-[8px] font-bold leading-[13px] text-[#17151c]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

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
      className={[
        "group relative flex items-center gap-3 px-3 py-2.5 text-sm transition",
        collapsed ? "justify-center" : "",
        active
          ? "bg-white/[0.07] text-white"
          : "text-white/40 hover:bg-white/[0.035] hover:text-white/75",
      ].join(" ")}
    >
      {active && (
        <span className="absolute bottom-2 left-0 top-2 w-0.5 bg-white/80" />
      )}

      <Icon
        size={17}
        strokeWidth={active ? 2 : 1.8}
        className={[
          "shrink-0 transition-colors",
          active
            ? "text-white"
            : "text-white/30 group-hover:text-white/60",
        ].join(" ")}
      />

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate font-medium">
            {item.label}
          </span>

          {item.badge && (
            <span className="text-[8px] font-medium uppercase tracking-wider text-white/25">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* App Shell                                                                  */
/* -------------------------------------------------------------------------- */

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
    window.localStorage.getItem(
      "studyspace-sidebar-collapsed"
    ) === "true"
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

    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!authUser) {
        router.replace("/login");
        return;
      }

      updateUser(authUser);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        updateUser(session.user);
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
      pathname.startsWith(`${href}/`)
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111016] text-white">
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.04]">
            <GraduationCap
              size={20}
              className="text-white/60"
            />
          </div>

          <p className="mt-4 text-xs text-white/25">
            Loading StudySpace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111016] text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.08] bg-[#15141a]",
          "transition-all duration-200",
          collapsed ? "w-[72px]" : "w-[244px]",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex h-[68px] items-center border-b border-white/[0.08] px-4">
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={[
              "flex min-w-0 items-center",
              collapsed
                ? "mx-auto"
                : "gap-3",
            ].join(" ")}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/[0.1] bg-white/[0.06]">
              <GraduationCap
                size={19}
                className="text-white/75"
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[16px] font-semibold tracking-tight">
                  StudySpace
                </div>

                <div className="mt-0.5 truncate text-[10px] text-white/25">
                  Your student workspace
                </div>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="ml-auto p-2 text-white/30 transition hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2.5 py-5">
          {!collapsed && (
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/20">
              Workspace
            </div>
          )}

          <nav className="space-y-0.5">
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
                <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/20">
                  Administration
                </div>
              )}

              <Link
                href="/admin"
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? "Admin" : undefined}
                className={[
                  "group relative flex items-center gap-3 px-3 py-2.5 text-sm transition",
                  collapsed ? "justify-center" : "",
                  isActive("/admin")
                    ? "bg-white/[0.07] text-white"
                    : "text-white/40 hover:bg-white/[0.035] hover:text-white/75",
                ].join(" ")}
              >
                {isActive("/admin") && (
                  <span className="absolute bottom-2 left-0 top-2 w-0.5 bg-white/80" />
                )}

                <Sparkles
                  size={17}
                  className="shrink-0 text-white/40"
                />

                {!collapsed && (
                  <span className="font-medium">
                    Admin
                  </span>
                )}
              </Link>
            </div>
          )}

          {/* Account */}
          <div className="mt-7">
            {!collapsed && (
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/20">
                Account
              </div>
            )}

            <nav className="space-y-0.5">
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
        <div className="border-t border-white/[0.08] p-3">
          <div
            className={[
              "flex items-center gap-3",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <Link
              href="/settings"
              title={collapsed ? user?.name : undefined}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.07] text-xs font-semibold text-white/75 transition hover:bg-white/[0.1]"
            >
              {user?.name?.charAt(0).toUpperCase() || "S"}
            </Link>

            {!collapsed && (
              <>
                <Link
                  href="/settings"
                  className="min-w-0 flex-1"
                >
                  <div className="truncate text-sm font-medium text-white/75 transition hover:text-white">
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
                  className="p-2 text-white/25 transition hover:text-red-300"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapse */}
        <button
          type="button"
          onClick={() =>
            setCollapsed((value) => !value)
          }
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          className="absolute -right-3 top-[76px] hidden h-6 w-6 items-center justify-center border border-white/[0.12] bg-[#19181f] text-white/35 transition hover:text-white lg:flex"
        >
          {collapsed ? (
            <ChevronRight size={13} />
          ) : (
            <ChevronLeft size={13} />
          )}
        </button>
      </aside>

      {/* Main */}
      <div
        className={[
          "min-h-screen transition-all duration-200",
          collapsed
            ? "lg:pl-[72px]"
            : "lg:pl-[244px]",
        ].join(" ")}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center border-b border-white/[0.08] bg-[#111016]/95 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center border border-white/[0.08] text-white/45 transition hover:bg-white/[0.04] hover:text-white lg:hidden"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-white">
                {title || "StudySpace"}
              </h1>

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
              className={[
                "hidden h-9 w-9 items-center justify-center border transition sm:flex",
                pathname === "/settings"
                  ? "border-white/[0.15] bg-white/[0.07] text-white"
                  : "border-white/[0.08] text-white/35 hover:bg-white/[0.04] hover:text-white",
              ].join(" ")}
            >
              <Settings size={16} />
            </Link>

            <Link
              href="/settings"
              title={user?.name || "Profile"}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.07] text-xs font-semibold text-white/75 transition hover:bg-white/[0.1]"
            >
              {user?.name?.charAt(0).toUpperCase() || "S"}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-68px)]">
          {children}
        </main>
      </div>
    </div>
  );
}