"use client";

import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Sparkles,
  X,
  Brain,
  Shield,
} from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";
import NotificationCenter from "@/components/NotificationCenter";

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
};

const mainNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "AI Tutor",
    href: "/ai-tutor",
    icon: Sparkles,
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
    icon: GraduationCap,
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Homework",
    href: "/homework-uploader",
    icon: FileText,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
];

const secondaryNavigation: NavItem[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const adminNavigation: NavItem[] = [
  {
    label: "Admin",
    href: "/admin",
    icon: Shield,
  },
];

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [collapsed, setCollapsed] =
    useState(false);

  const [userName, setUserName] =
    useState("Student");

  const [userEmail, setUserEmail] =
    useState("");

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [authLoading, setAuthLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/login");
          return;
        }

        if (!mounted) return;

        const metadata = user.user_metadata || {};

        const fullName =
          typeof metadata.full_name === "string"
            ? metadata.full_name.trim()
            : "";

        const email = user.email || "";

        setUserName(
          fullName ||
            email.split("@")[0] ||
            "Student"
        );

        setUserEmail(email);

        setIsAdmin(isAdminEmail(email));
      } catch (error) {
        console.error(
          "Failed to load authenticated user:",
          error
        );

        router.replace("/login");
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    } finally {
      router.replace("/login");
    }
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

  function closeMobileSidebar() {
    setSidebarOpen(false);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080611]">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
            <Brain
              size={22}
              className="text-violet-400"
            />
          </div>

          <div className="mt-4 h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />

          <p className="mt-3 text-xs text-white/35">
            Loading StudySpace...
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
          aria-label="Close sidebar"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          border-r border-white/[0.07]
          bg-[#0b0713]/95
          backdrop-blur-2xl
          transition-all duration-300
          lg:translate-x-0
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
          ${
            collapsed
              ? "w-[76px]"
              : "w-[260px]"
          }
        `}
      >
        {/* Logo */}
        <div
          className={`
            flex h-[72px] shrink-0 items-center
            border-b border-white/[0.07]
            ${
              collapsed
                ? "justify-center px-3"
                : "justify-between px-5"
            }
          `}
        >
          <Link
            href="/dashboard"
            onClick={closeMobileSidebar}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
              <Brain
                size={19}
                strokeWidth={2.4}
                className="text-white"
              />
            </div>

            {!collapsed && (
              <div className="overflow-hidden">
                <div className="whitespace-nowrap text-[15px] font-bold tracking-tight text-white">
                  StudySpace
                </div>

                <div className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.18em] text-violet-400/70">
                  Your academic OS
                </div>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() =>
              setCollapsed((current) => !current)
            }
            className="hidden h-7 w-7 items-center justify-center rounded-lg text-white/25 transition hover:bg-white/5 hover:text-white/70 lg:flex"
            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {collapsed ? (
              <ChevronRight size={15} />
            ) : (
              <ChevronLeft size={15} />
            )}
          </button>

          <button
            type="button"
            onClick={closeMobileSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={17} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div className="space-y-1">
            {!collapsed && (
              <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                Workspace
              </div>
            )}

            {mainNavigation.map((item) => {
              const active = isActive(
                item.href
              );

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileSidebar}
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                  className={`
                    group relative flex h-11 items-center
                    rounded-xl
                    text-sm font-medium
                    transition-all duration-150
                    ${
                      collapsed
                        ? "justify-center px-2"
                        : "gap-3 px-3"
                    }
                    ${
                      active
                        ? "bg-violet-500/12 text-violet-200"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white/85"
                    }
                  `}
                >
                  {active && (
                    <span className="absolute left-0 h-5 w-0.5 rounded-full bg-violet-400" />
                  )}

                  <Icon
                    size={18}
                    strokeWidth={
                      active ? 2.2 : 1.8
                    }
                    className={
                      active
                        ? "text-violet-400"
                        : "text-white/35 transition group-hover:text-white/65"
                    }
                  />

                  {!collapsed && (
                    <span className="truncate">
                      {item.label}
                    </span>
                  )}

                  {collapsed && (
                    <span className="pointer-events-none absolute left-[calc(100%+10px)] z-[100] hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#171021] px-2.5 py-1.5 text-xs text-white shadow-xl group-hover:block">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Admin */}
          {isAdmin && (
            <div className="mt-7">
              {!collapsed && (
                <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                  Administration
                </div>
              )}

              {adminNavigation.map((item) => {
                const active = isActive(
                  item.href
                );

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileSidebar}
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                    className={`
                      group relative flex h-11 items-center rounded-xl text-sm font-medium transition-all
                      ${
                        collapsed
                          ? "justify-center px-2"
                          : "gap-3 px-3"
                      }
                      ${
                        active
                          ? "bg-violet-500/12 text-violet-200"
                          : "text-white/45 hover:bg-white/[0.04] hover:text-white/85"
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 h-5 w-0.5 rounded-full bg-violet-400" />
                    )}

                    <Icon
                      size={18}
                      strokeWidth={
                        active ? 2.2 : 1.8
                      }
                      className={
                        active
                          ? "text-violet-400"
                          : "text-white/35"
                      }
                    />

                    {!collapsed && (
                      <span>
                        {item.label}
                      </span>
                    )}

                    {collapsed && (
                      <span className="pointer-events-none absolute left-[calc(100%+10px)] z-[100] hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#171021] px-2.5 py-1.5 text-xs text-white shadow-xl group-hover:block">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Settings */}
          <div className="mt-7">
            {!collapsed && (
              <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                Account
              </div>
            )}

            {secondaryNavigation.map(
              (item) => {
                const active = isActive(
                  item.href
                );

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileSidebar}
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                    className={`
                      group relative flex h-11 items-center rounded-xl text-sm font-medium transition-all
                      ${
                        collapsed
                          ? "justify-center px-2"
                          : "gap-3 px-3"
                      }
                      ${
                        active
                          ? "bg-violet-500/12 text-violet-200"
                          : "text-white/45 hover:bg-white/[0.04] hover:text-white/85"
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 h-5 w-0.5 rounded-full bg-violet-400" />
                    )}

                    <Icon
                      size={18}
                      strokeWidth={
                        active ? 2.2 : 1.8
                      }
                      className={
                        active
                          ? "text-violet-400"
                          : "text-white/35"
                      }
                    />

                    {!collapsed && (
                      <span>
                        {item.label}
                      </span>
                    )}

                    {collapsed && (
                      <span className="pointer-events-none absolute left-[calc(100%+10px)] z-[100] hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#171021] px-2.5 py-1.5 text-xs text-white shadow-xl group-hover:block">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              }
            )}
          </div>
        </div>

        {/* User section */}
        <div className="shrink-0 border-t border-white/[0.07] p-3">
          <div
            className={`
              flex items-center rounded-xl
              bg-white/[0.025]
              ${
                collapsed
                  ? "justify-center p-2"
                  : "gap-3 px-3 py-2.5"
              }
            `}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-xs font-bold text-violet-200 ring-1 ring-white/10">
              {userName
                .charAt(0)
                .toUpperCase()}
            </div>

            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white/80">
                    {userName}
                  </p>

                  <p className="mt-0.5 truncate text-[10px] text-white/30">
                    {userEmail}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/25 transition hover:bg-red-500/10 hover:text-red-400"
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}

            {collapsed && (
              <button
                type="button"
                onClick={handleLogout}
                className="hidden"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex h-9 w-full items-center justify-center rounded-xl text-white/25 transition hover:bg-red-500/10 hover:text-red-400"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>

      {/* Main application */}
      <div
        className={`
          min-h-screen transition-[padding] duration-300
          ${
            collapsed
              ? "lg:pl-[76px]"
              : "lg:pl-[260px]"
          }
        `}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-[72px] border-b border-white/[0.07] bg-[#080611]/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/55 transition hover:bg-white/[0.07] hover:text-white lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={19} />
              </button>

              <div className="hidden sm:block">
                <p className="text-xs text-white/25">
                  StudySpace
                </p>

                <p className="mt-0.5 text-sm font-medium text-white/70">
                  {pathname === "/dashboard"
                    ? "Dashboard"
                    : pathname
                        .split("/")
                        .filter(Boolean)
                        .pop()
                        ?.replace(
                          /-/g,
                          " "
                        )
                        .replace(
                          /\b\w/g,
                          (letter) =>
                            letter.toUpperCase()
                        ) ||
                      "Workspace"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationCenter />

              <div className="mx-1 hidden h-7 w-px bg-white/[0.07] sm:block" />

              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-[11px] font-bold text-violet-200">
                  {userName
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="hidden max-w-[150px] text-left sm:block">
                  <p className="truncate text-xs font-semibold text-white/75">
                    {userName}
                  </p>

                  <p className="truncate text-[10px] text-white/25">
                    {isAdmin
                      ? "Administrator"
                      : "Student"}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-72px)]">
          {children}
        </main>
      </div>
    </div>
  );
}