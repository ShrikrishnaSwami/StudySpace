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
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import NotificationCenter from "@/components/NotificationCenter";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

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
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
];

const bottomNavigation = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

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

      if (!mounted) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const email = user.email || "";

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

      setIsAdmin(isAdminEmail(email));
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const authUser = session.user;
        const email = authUser.email || "";

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

        setIsAdmin(isAdminEmail(email));
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const sidebarIsOpen = sidebarOpen && !pathname;

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
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.07] bg-[#0b0813]/95 backdrop-blur-xl transition-all duration-300",
          collapsed ? "w-[78px]" : "w-[260px]",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="flex h-[76px] items-center border-b border-white/[0.07] px-4">
          <Link
            href="/dashboard"
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
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white lg:hidden"
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
            {mainNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
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

                  {!collapsed && active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                  )}
                </Link>
              );
            })}
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
                title={collapsed ? "Admin" : undefined}
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
                  <span>Admin</span>
                )}
              </Link>
            </div>
          )}

          {/* Bottom navigation */}
          <div className="mt-7">
            {!collapsed && (
              <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                Account
              </div>
            )}

            <nav className="space-y-1">
              {bottomNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
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
                      <span>{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User card */}
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
                .toUpperCase() || "S"}
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

        {/* Collapse button */}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute -right-3 top-[88px] hidden h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#151021] text-white/50 shadow-lg hover:text-white lg:flex"
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          {collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>
      </aside>

      {/* Main content */}
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
              {title ? (
                <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {title}
                </h1>
              ) : (
                <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  StudySpace
                </h1>
              )}

              {description && (
                <p className="mt-0.5 hidden truncate text-xs text-white/35 sm:block">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationCenter />

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
              title={user?.name || "Profile"}
            >
              {user?.name
                ?.charAt(0)
                .toUpperCase() || "S"}
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