"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileUp,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PenLine,
  X,
  Clock3,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "AI Tutor",
    href: "/ai-tutor",
    icon: MessageSquare,
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    name: "Courses",
    href: "/courses",
    icon: BookOpen,
  },
  {
    name: "Assignments",
    href: "/assignments",
    icon: ClipboardList,
  },
  {
    name: "Quizzes",
    href: "/quizzes",
    icon: PenLine,
  },
  {
    name: "Homework Uploader",
    href: "/homework-uploader",
    icon: FileUp,
  },
];

const assignments = [
  {
    title: "Physics Lab Report",
    course: "Physics",
    due: "Tomorrow",
    status: "Due soon",
  },
  {
    title: "Calculus Problem Set",
    course: "Calculus",
    due: "Monday",
    status: "In progress",
  },
  {
    title: "Programming Assignment",
    course: "Computer Science",
    due: "Wednesday",
    status: "Not started",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [userName, setUserName] = useState("Student");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const name =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Student";

      setUserName(name);
    }

    loadUser();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#080611] text-white">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-white/10 bg-[#0b0814]/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 shadow-lg shadow-purple-900/40">
              <GraduationCap size={21} />
            </div>

            <div>
              <p className="font-bold tracking-tight">StudySpace</p>
              <p className="text-[11px] text-zinc-500">Student workspace</p>
            </div>
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-purple-600/15 text-purple-300 ring-1 ring-purple-500/20"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600/20 text-sm font-semibold text-purple-300">
              {userName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="text-xs text-zinc-600">Student</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:pl-72">
        <header className="flex h-20 items-center border-b border-white/10 px-6 lg:px-10">
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-4 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-zinc-400 hover:text-white lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1">
            <p className="text-sm text-zinc-500">StudySpace</p>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-zinc-600">Student account</p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          {/* Welcome */}
          <section className="mb-8">
            <p className="mb-2 text-sm font-medium text-purple-400">
              Your academic command center
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Good to see you, {userName.split(" ")[0]}.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Here&apos;s a snapshot of your academic workspace. Keep track of what
              matters and stay ahead of what&apos;s coming next.
            </p>
          </section>

          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<BookOpen size={19} />}
              label="Active courses"
              value="4"
              detail="This semester"
            />

            <StatCard
              icon={<ClipboardList size={19} />}
              label="Assignments"
              value="12"
              detail="3 due this week"
            />

            <StatCard
              icon={<PenLine size={19} />}
              label="Upcoming quizzes"
              value="3"
              detail="Next one in 2 days"
            />

            <StatCard
              icon={<Clock3 size={19} />}
              label="Study time"
              value="8.5h"
              detail="This week"
            />
          </section>

          {/* Content */}
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            {/* Assignments */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Upcoming assignments</h2>
                  <p className="mt-1 text-xs text-zinc-600">
                    Keep an eye on what&apos;s due next.
                  </p>
                </div>

                <Link
                  href="/assignments"
                  className="text-xs font-medium text-purple-400 hover:text-purple-300"
                >
                  View all
                </Link>
              </div>

              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.title}
                    className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-black/10 p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                      <ClipboardList size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {assignment.title}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {assignment.course}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-zinc-300">
                        {assignment.due}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        {assignment.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="mb-6">
                <h2 className="font-semibold">Weekly progress</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Your study activity this week.
                </p>
              </div>

              <div className="mb-6 flex items-end gap-4">
                <span className="text-5xl font-bold">72%</span>
                <span className="mb-1 text-xs text-emerald-400">
                  +8% this week
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-[72%] rounded-full bg-purple-500" />
              </div>

              <div className="mt-6 space-y-4">
                <ProgressRow
                  icon={<CheckCircle2 size={17} />}
                  label="Assignments"
                  value="8 / 10"
                  percentage="80%"
                />

                <ProgressRow
                  icon={<CircleAlert size={17} />}
                  label="Quizzes"
                  value="2 / 3"
                  percentage="67%"
                />

                <ProgressRow
                  icon={<Clock3 size={17} />}
                  label="Study goal"
                  value="8.5 / 12h"
                  percentage="71%"
                />
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-zinc-300">
              Quick access
            </h2>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                href="/ai-tutor"
                icon={<MessageSquare size={19} />}
                title="Ask AI Tutor"
                description="Get study help"
              />

              <QuickAction
                href="/calendar"
                icon={<CalendarDays size={19} />}
                title="Open Calendar"
                description="See your schedule"
              />

              <QuickAction
                href="/courses"
                icon={<BookOpen size={19} />}
                title="My Courses"
                description="Browse courses"
              />

              <QuickAction
                href="/homework-uploader"
                icon={<FileUp size={19} />}
                title="Upload Homework"
                description="Add your work"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-purple-500/20 hover:bg-white/[0.04]">
      <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
        {icon}
      </div>

      <p className="text-xs text-zinc-600">{label}</p>

      <div className="mt-1 flex items-end gap-2">
        <span className="text-3xl font-bold">{value}</span>
      </div>

      <p className="mt-1 text-xs text-zinc-600">{detail}</p>
    </div>
  );
}

function ProgressRow({
  icon,
  label,
  value,
  percentage,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  percentage: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          {icon}
          {label}
        </div>

        <span className="text-zinc-600">
          {value} · {percentage}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-purple-500/70"
          style={{ width: percentage }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:border-purple-500/30 hover:bg-purple-500/[0.04]"
    >
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 transition group-hover:bg-purple-500/15">
        {icon}
      </div>

      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-zinc-600">{description}</p>
    </Link>
  );
}
