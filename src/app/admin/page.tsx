"use client";

import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CheckSquare,
  GraduationCap,
  ShieldCheck,
  Users,
  ClipboardList,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

const stats = [
  {
    title: "Total Users",
    value: "1,284",
    change: "+12.5%",
    icon: Users,
  },
  {
    title: "Active Students",
    value: "936",
    change: "+8.2%",
    icon: GraduationCap,
  },
  {
    title: "Courses",
    value: "64",
    change: "+4.1%",
    icon: BookOpen,
  },
  {
    title: "Assignments",
    value: "2,841",
    change: "+18.7%",
    icon: CheckSquare,
  },
];

const activity = [
  {
    icon: UserPlus,
    title: "New student registration",
    description: "A new account was created",
    time: "4 minutes ago",
  },
  {
    icon: BookOpen,
    title: "Course created",
    description: "Introduction to Data Structures",
    time: "18 minutes ago",
  },
  {
    icon: ClipboardList,
    title: "Assignment created",
    description: "Calculus I — Problem Set 4",
    time: "42 minutes ago",
  },
  {
    icon: Activity,
    title: "System activity",
    description: "87 students active today",
    time: "1 hour ago",
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!isAdminEmail(user.email)) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    }

    checkAdmin();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080611] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400" />
          <p className="text-sm text-white/40">
            Verifying administrator access...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Admin Dashboard"
      description="StudySpace system overview"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
              <ShieldCheck size={13} />
              Administrator
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              System overview
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Monitor StudySpace activity and platform statistics.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-500/[0.05] px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
            <span className="text-xs text-emerald-300">
              All systems operational
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-violet-400/20"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <Icon size={19} />
                  </div>

                  <ArrowUpRight
                    size={16}
                    className="text-white/20"
                  />
                </div>

                <p className="text-sm text-white/40">
                  {stat.title}
                </p>

                <div className="mt-1 flex items-end justify-between gap-3">
                  <p className="text-2xl font-bold">
                    {stat.value}
                  </p>

                  <span className="text-xs font-medium text-emerald-400">
                    {stat.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Secondary stats */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <p className="text-xs text-white/35">
              Quizzes
            </p>
            <p className="mt-2 text-2xl font-bold">
              427
            </p>
            <p className="mt-1 text-xs text-white/25">
              31 created this month
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <p className="text-xs text-white/35">
              Homework submissions
            </p>
            <p className="mt-2 text-2xl font-bold">
              6,492
            </p>
            <p className="mt-1 text-xs text-white/25">
              Across all courses
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <p className="text-xs text-white/35">
              Active today
            </p>
            <p className="mt-2 text-2xl font-bold">
              936
            </p>
            <p className="mt-1 text-xs text-emerald-400">
              72.9% of registered users
            </p>
          </div>
        </div>

        {/* Activity + system */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <h2 className="font-semibold">
                  Recent activity
                </h2>
                <p className="mt-1 text-xs text-white/30">
                  Latest events across StudySpace
                </p>
              </div>

              <button className="text-xs text-violet-400 hover:text-violet-300">
                View all
              </button>
            </div>

            <div className="divide-y divide-white/[0.05]">
              {activity.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={index}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-violet-400">
                      <Icon size={17} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-white/30">
                        {item.description}
                      </p>
                    </div>

                    <span className="shrink-0 text-[11px] text-white/20">
                      {item.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <h2 className="font-semibold">
              Platform health
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Current system status
            </p>

            <div className="mt-6 space-y-5">
              {[
                ["Authentication", "Operational"],
                ["Database", "Operational"],
                ["Storage", "Operational"],
                ["AI Services", "Demo mode"],
              ].map(([name, status]) => (
                <div
                  key={name}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-white/60">
                    {name}
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        status === "Demo mode"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />

                    <span
                      className={`text-xs ${
                        status === "Demo mode"
                          ? "text-amber-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}