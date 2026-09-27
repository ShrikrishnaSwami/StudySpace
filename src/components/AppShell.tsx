"use client";

import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "AI Tutor",
    href: "/ai-tutor",
    icon: Sparkles,
  },
  {
    name: "Courses",
    href: "/courses",
    icon: BookOpen,
  },
  {
    name: "Assignments",
    href: "/assignments",
    icon: CheckSquare,
  },
  {
    name: "Quizzes",
    href: "/quizzes",
    icon: MessageSquare,
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    name: "Homework",
    href: "/homework-uploader",
    icon: FileUp,
  },
];

export default function AppShell({
  children,
  title,
  description,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
  async function loadUser() {
    console.log("🔥 AppShell: loadUser started");

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log("🔥 AppShell: Supabase user:", user);
    console.log("🔥 AppShell: Supabase error:", error);

    if (!user) {
      console.log("❌ AppShell: No logged-in user");
      router.replace("/login");
      return;
    }

    console.log("✅ AppShell: Logged-in user found");
    console.log("📧 AppShell: User email:", user.email);

    const name = user.user_metadata?.full_name;

    setUserName(
      name || user.email?.split("@")[0] || "Student"
    );

    setUserEmail(user.email || "");

    const adminStatus = isAdminEmail(user.email);

    console.log("👑 AppShell: Is admin:", adminStatus);

    setIsAdmin(adminStatus);
    setLoadingUser(false);
  }

  loadUser();
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
      pathname.startsWith(href + "/")
    );
  }

  return (
    <div className="min-h-screen bg-[#080611] text-white">

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[270px] flex-col border-r border-white/[0.07] bg-[#0b0814]/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6">

          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/20">
              <Sparkles size={20} />
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight">
                StudySpace
              </div>

              <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300/60">
                Student OS
              </div>
            </div>
          </Link>

          {/* Close mobile sidebar */}
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================== */}

        <nav className="flex-1 overflow-y-auto px-4 py-6">

          {/* Workspace */}
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            Workspace
          </div>

          <div className="space-y-1">

            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-violet-500/15 text-violet-200 shadow-inner shadow-violet-500/5"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-violet-400"
                        : "text-white/35 group-hover:text-white/70"
                    }
                  />

                  <span>{item.name}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* =================================================
              ADMIN SECTION
          ================================================== */}

          {isAdmin && (
            <>
              <div className="my-7 h-px bg-white/[0.06]" />

              <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                Administration
              </div>

              <Link
                href="/admin"
                onClick={() =>
                  setMobileOpen(false)
                }
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive("/admin")
                    ? "bg-violet-500/15 text-violet-200 shadow-inner shadow-violet-500/5"
                    : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <ShieldCheck
                  size={18}
                  className={
                    isActive("/admin")
                      ? "text-violet-400"
                      : "text-white/35 group-hover:text-white/70"
                  }
                />

                <span>Admin</span>

                {isActive("/admin") && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
                )}
              </Link>
            </>
          )}

          {/* Divider */}
          <div className="my-7 h-px bg-white/[0.06]" />

          {/* Account */}
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            Account
          </div>

          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
              isActive("/settings")
                ? "bg-violet-500/15 text-violet-200"
                : "text-white/55 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <Settings
              size={18}
              className={
                isActive("/settings")
                  ? "text-violet-400"
                  : "text-white/35 group-hover:text-white/70"
              }
            />

            <span>Settings</span>

            {isActive("/settings") && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
            )}
          </Link>
        </nav>

        {/* =================================================
            USER PROFILE / LOGOUT
        ================================================== */}

        <div className="border-t border-white/[0.07] p-4">

          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">

            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold">
              {userName
                .charAt(0)
                .toUpperCase()}
            </div>

            {/* User info */}
            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-semibold">
                {loadingUser
                  ? "Loading..."
                  : userName}
              </p>

              <p className="truncate text-xs text-white/35">
                {userEmail}
              </p>

            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Log out"
              className="rounded-lg p-2 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={17} />
            </button>

          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="lg:pl-[270px]">

        {/* =================================================
            TOP BAR
        ================================================== */}

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/[0.06] bg-[#080611]/80 px-5 backdrop-blur-xl sm:px-8">

          <div className="flex items-center gap-4">

            {/* Mobile menu */}
            <button
              onClick={() =>
                setMobileOpen(true)
              }
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-white/60 hover:text-white lg:hidden"
            >
              <Menu size={20} />
            </button>

            {/* Page title */}
            <div className="hidden sm:block">

              {title && (
                <h1 className="text-lg font-semibold">
                  {title}
                </h1>
              )}

              {description && (
                <p className="text-xs text-white/35">
                  {description}
                </p>
              )}

            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">

            {/* Notifications */}
            <button
              className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-white/50 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
              title="Notifications"
            >
              <Bell size={18} />

              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-400" />
            </button>

            {/* User dropdown UI */}
            <button
              className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 sm:flex"
            >

              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold">
                {userName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <span className="max-w-28 truncate text-sm text-white/70">
                {userName}
              </span>

              <ChevronDown
                size={14}
                className="text-white/30"
              />

            </button>
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
        ================================================== */}

        <main className="min-h-[calc(100vh-80px)] p-5 sm:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}