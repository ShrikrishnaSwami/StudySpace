"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  FileText,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

const upcomingAssignments = [
  {
    title: "Physics Lab Report",
    course: "PHY 1001",
    due: "Tomorrow",
    priority: "High",
  },
  {
    title: "Calculus Problem Set 4",
    course: "MAT 1002",
    due: "Sep 29",
    priority: "Medium",
  },
  {
    title: "Programming Assignment 2",
    course: "CSI 1100",
    due: "Oct 1",
    priority: "High",
  },
  {
    title: "Academic Writing Essay",
    course: "ENG 1001",
    due: "Oct 3",
    priority: "Low",
  },
];

const weeklyProgress = [
  {
    day: "Mon",
    hours: 2.2,
  },
  {
    day: "Tue",
    hours: 1.5,
  },
  {
    day: "Wed",
    hours: 3.1,
  },
  {
    day: "Thu",
    hours: 1.8,
  },
  {
    day: "Fri",
    hours: 2.7,
  },
  {
    day: "Sat",
    hours: 3.5,
  },
  {
    day: "Sun",
    hours: 1.2,
  },
];

export default function DashboardPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("Student");

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserName(
        user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Student"
      );
    }

    loadUser();
  }, [router]);

  return (
    <AppShell
      title="Dashboard"
      description="Your academic overview"
    >
      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            WELCOME
        ====================================================== */}

        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-violet-600/[0.15] via-white/[0.025] to-fuchsia-600/[0.08] p-6 sm:p-8">

          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
              <Sparkles size={13} />
              Welcome back
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Hey, {userName} 👋
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
              Here&apos;s what&apos;s happening with your studies.
              Keep your momentum going and stay on top of
              your upcoming work.
            </p>
          </div>
        </section>

        {/* =====================================================
            STATS
        ====================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <DashboardStat
            icon={BookOpen}
            title="Active courses"
            value="4"
            description="This semester"
          />

          <DashboardStat
            icon={FileText}
            title="Assignments"
            value="12"
            description="3 due this week"
          />

          <DashboardStat
            icon={Target}
            title="Upcoming quizzes"
            value="3"
            description="Next 14 days"
          />

          <DashboardStat
            icon={Clock3}
            title="Study time"
            value="8.5h"
            description="This week"
          />

        </div>

        {/* =====================================================
            MAIN GRID
        ====================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">

          {/* Assignments */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025]">

            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">

              <div>
                <h2 className="font-semibold">
                  Upcoming assignments
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  Keep an eye on what&apos;s due next.
                </p>
              </div>

              <button
                onClick={() =>
                  router.push("/assignments")
                }
                className="flex items-center gap-1 text-xs font-medium text-violet-400 transition hover:text-violet-300"
              >
                View all
                <ArrowRight size={13} />
              </button>

            </div>

            <div className="divide-y divide-white/[0.05]">

              {upcomingAssignments.map(
                (assignment) => (
                  <div
                    key={assignment.title}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.02]"
                  >

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                      <FileText size={17} />
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-medium">
                        {assignment.title}
                      </p>

                      <p className="mt-1 text-xs text-white/30">
                        {assignment.course}
                      </p>

                    </div>

                    <div className="hidden text-right sm:block">

                      <p className="text-xs text-white/40">
                        {assignment.due}
                      </p>

                      <p
                        className={`mt-1 text-[10px] font-medium ${
                          assignment.priority ===
                          "High"
                            ? "text-red-400"
                            : assignment.priority ===
                              "Medium"
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {assignment.priority} priority
                      </p>

                    </div>

                  </div>
                )
              )}

            </div>
          </section>

          {/* Weekly progress */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025]">

            <div className="border-b border-white/[0.06] px-5 py-4">

              <div className="flex items-center gap-2">
                <TrendingUp
                  size={17}
                  className="text-violet-400"
                />

                <h2 className="font-semibold">
                  Weekly progress
                </h2>
              </div>

              <p className="mt-1 text-xs text-white/30">
                Study hours this week
              </p>

            </div>

            <div className="p-5">

              <div className="mb-6 flex items-end justify-between">

                <div>
                  <p className="text-3xl font-bold">
                    16.0h
                  </p>

                  <p className="mt-1 text-xs text-emerald-400">
                    +18% from last week
                  </p>
                </div>

                <div className="rounded-xl bg-violet-500/10 px-3 py-2 text-xs text-violet-300">
                  Goal: 20h
                </div>

              </div>

              <div className="flex h-44 items-end justify-between gap-2">

                {weeklyProgress.map((day) => {
                  const height =
                    (day.hours / 4) * 100;

                  return (
                    <div
                      key={day.day}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >

                      <div className="relative flex h-full w-full items-end">

                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-violet-600/80 to-fuchsia-500/80 transition hover:from-violet-500 hover:to-fuchsia-400"
                          style={{
                            height: `${height}%`,
                          }}
                        />

                      </div>

                      <span className="text-[10px] text-white/25">
                        {day.day}
                      </span>

                    </div>
                  );
                })}

              </div>

            </div>
          </section>
        </div>

        {/* =====================================================
            QUICK ACCESS
        ====================================================== */}

        <section className="mt-6">

          <div className="mb-4">
            <h2 className="font-semibold">
              Quick access
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Jump straight into your workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <QuickAccess
              icon={Sparkles}
              title="AI Tutor"
              description="Ask questions and learn"
              href="/ai-tutor"
            />

            <QuickAccess
              icon={BookOpen}
              title="Courses"
              description="View your classes"
              href="/courses"
            />

            <QuickAccess
              icon={CalendarDays}
              title="Calendar"
              description="See your schedule"
              href="/calendar"
            />

            <QuickAccess
              icon={FileText}
              title="Homework"
              description="Analyze your work"
              href="/homework-uploader"
            />

          </div>
        </section>

      </div>
    </AppShell>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function DashboardStat({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-violet-400/20">

      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
        <Icon size={19} />
      </div>

      <p className="text-sm text-white/40">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/25">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   QUICK ACCESS
============================================================ */

function QuickAccess({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  href: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-left transition hover:border-violet-400/20 hover:bg-violet-500/[0.04]"
    >

      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-violet-400 transition group-hover:bg-violet-500/10">
        <Icon size={18} />
      </div>

      <p className="text-sm font-semibold">
        {title}
      </p>

      <p className="mt-1 text-xs text-white/30">
        {description}
      </p>

    </button>
  );
}