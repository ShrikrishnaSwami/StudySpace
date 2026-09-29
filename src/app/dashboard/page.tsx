"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  GraduationCap,
  ListChecks,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

import {
  getCalendarEvents,
  type CalendarEvent,
} from "@/lib/calendar";

import {
  getNotifications,
  type Notification,
} from "@/lib/notifications";

import {
  completeStudyRecommendation,
  deleteStudyRecommendation,
  getStudyRecommendations,
  type StudyRecommendation,
} from "@/lib/study-recommendations";

/* =========================================================
   TYPES
========================================================= */

type Course = {
  id: string;
  code: string | null;
  name: string;
  professor: string | null;
  progress: number | null;
  target_grade: number | null;
  color: string | null;
};

type Assignment = {
  id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  priority: string | null;
  status: string | null;
  progress: number | null;
  points: number | null;
  max_points: number | null;
};

type Quiz = {
  id: string;
  course_id: string | null;
  title: string;
  difficulty: string | null;
  created_at: string;
};

type Homework = {
  id: string;
  course_id: string | null;
  title: string;
  status: string;
  created_at: string;
};

/* =========================================================
   HELPERS
========================================================= */

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

function isToday(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isUpcoming(dateString: string) {
  const timestamp = new Date(dateString).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return (
    timestamp >= Date.now() &&
    timestamp <=
      Date.now() + 7 * 24 * 60 * 60 * 1000
  );
}

function priorityClasses(
  priority: StudyRecommendation["priority"]
) {
  switch (priority) {
    case "urgent":
      return {
        badge:
          "border-red-400/20 bg-red-500/10 text-red-300",
        dot: "bg-red-400",
        icon: "text-red-400",
      };

    case "high":
      return {
        badge:
          "border-orange-400/20 bg-orange-500/10 text-orange-300",
        dot: "bg-orange-400",
        icon: "text-orange-400",
      };

    case "medium":
      return {
        badge:
          "border-amber-400/20 bg-amber-500/10 text-amber-300",
        dot: "bg-amber-400",
        icon: "text-amber-400",
      };

    default:
      return {
        badge:
          "border-slate-400/20 bg-slate-500/10 text-slate-300",
        dot: "bg-slate-400",
        icon: "text-slate-400",
      };
  }
}

function priorityLabel(
  priority: StudyRecommendation["priority"]
) {
  return (
    priority.charAt(0).toUpperCase() +
    priority.slice(1)
  );
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function ProgressBar({
  value,
}: {
  value: number;
}) {
  const safeValue = Math.min(
    100,
    Math.max(0, value)
  );

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
        style={{
          width: `${safeValue}%`,
        }}
      />
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/50">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-[-0.01em] text-white">
            {title}
          </h2>

          {description && (
            <p className="mt-0.5 truncate text-xs text-white/30">
              {description}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  detail,
  iconClass,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  detail: string;
  iconClass: string;
}) {
  return (
    <div className="group bg-[#0b0910] p-5 transition-colors hover:bg-[#100d17] sm:p-6">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/20">
          {detail}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-3xl font-semibold tracking-[-0.04em] text-white">
          {value}
        </p>

        <p className="mt-1 text-xs text-white/35">
          {label}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.035] text-white/20">
        {icon}
      </div>

      <p className="mt-4 text-sm font-medium text-white/65">
        {title}
      </p>

      <p className="mt-1 max-w-xs text-xs leading-5 text-white/25">
        {description}
      </p>
    </div>
  );
}

function AIDataChip({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active
            ? "bg-emerald-400"
            : "bg-white/15"
        }`}
      />

      <span className="text-[11px] text-white/40">
        {label}
      </span>
    </div>
  );
}

function BellEmptyIcon() {
  return (
    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.035]">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5 text-white/20"
      >
        <path
          d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  const [loading, setLoading] =
    useState(true);

  const [
    generatingRecommendations,
    setGeneratingRecommendations,
  ] = useState(false);

  const [userName, setUserName] =
    useState("Student");

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [homework, setHomework] =
    useState<Homework[]>([]);

  const [calendarEvents, setCalendarEvents] =
    useState<CalendarEvent[]>([]);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [recommendations, setRecommendations] =
    useState<StudyRecommendation[]>([]);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const loadDashboard =
    useCallback(async () => {
      try {
        setError(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(
            authError.message
          );
        }

        if (!user) {
          throw new Error(
            "You must be logged in."
          );
        }

        const name =
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Student";

        setUserName(name);

        const [
          coursesResult,
          assignmentsResult,
          quizzesResult,
          homeworkResult,
          eventsResult,
          notificationsResult,
          recommendationsResult,
        ] = await Promise.all([
          supabase
            .from("courses")
            .select(
              "id, code, name, professor, progress, target_grade, color"
            )
            .eq("user_id", user.id)
            .eq("archived", false)
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("assignments")
            .select(
              "id, course_id, title, description, due_date, priority, status, progress, points, max_points"
            )
            .eq("user_id", user.id)
            .order("due_date", {
              ascending: true,
            }),

          supabase
            .from("quizzes")
            .select(
              "id, course_id, title, difficulty, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("homework")
            .select(
              "id, course_id, title, status, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            }),

          getCalendarEvents(),

          getNotifications(10),

          getStudyRecommendations(20),
        ]);

        if (coursesResult.error) {
          throw new Error(
            coursesResult.error.message
          );
        }

        if (assignmentsResult.error) {
          throw new Error(
            assignmentsResult.error.message
          );
        }

        if (quizzesResult.error) {
          throw new Error(
            quizzesResult.error.message
          );
        }

        if (homeworkResult.error) {
          throw new Error(
            homeworkResult.error.message
          );
        }

        setCourses(
          (coursesResult.data ||
            []) as Course[]
        );

        setAssignments(
          (assignmentsResult.data ||
            []) as Assignment[]
        );

        setQuizzes(
          (quizzesResult.data ||
            []) as Quiz[]
        );

        setHomework(
          (homeworkResult.data ||
            []) as Homework[]
        );

        setCalendarEvents(
          eventsResult || []
        );

        setNotifications(
          notificationsResult || []
        );

        setRecommendations(
          recommendationsResult || []
        );
      } catch (err) {
        console.error(
          "Dashboard load error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Could not load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    const timeout =
      window.setTimeout(
        loadDashboard,
        0
      );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadDashboard]);

  useEffect(() => {
    const interval =
      window.setInterval(
        loadDashboard,
        60_000
      );

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const activeAssignments =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            assignment.status !==
              "completed" &&
            assignment.status !==
              "submitted"
        ),
      [assignments]
    );

  const completedAssignments =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            assignment.status ===
              "completed" ||
            assignment.status ===
              "submitted"
        ),
      [assignments]
    );

  const averageProgress =
    useMemo(() => {
      if (courses.length === 0) {
        return 0;
      }

      const total = courses.reduce(
        (sum, course) =>
          sum +
          (Number(course.progress) ||
            0),
        0
      );

      return Math.round(
        total / courses.length
      );
    }, [courses]);

  const todayEvents =
    useMemo(
      () =>
        calendarEvents
          .filter((event) =>
            isToday(event.start_at)
          )
          .sort(
            (a, b) =>
              new Date(
                a.start_at
              ).getTime() -
              new Date(
                b.start_at
              ).getTime()
          )
          .slice(0, 6),
      [calendarEvents]
    );

  const upcomingAssignments =
    useMemo(
      () =>
        activeAssignments
          .filter((assignment) =>
            isUpcoming(
              assignment.due_date
            )
          )
          .slice(0, 5),
      [activeAssignments]
    );

  const activeRecommendations =
    useMemo(
      () =>
        recommendations
          .filter(
            (recommendation) =>
              !recommendation.completed
          )
          .sort((a, b) => {
            const priorityOrder = {
              urgent: 0,
              high: 1,
              medium: 2,
              low: 3,
            };

            return (
              priorityOrder[
                a.priority
              ] -
                priorityOrder[
                  b.priority
                ] ||
              new Date(
                b.created_at
              ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
            );
          }),
      [recommendations]
    );

  const unreadNotifications =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  /* =======================================================
     GENERATE AI PLAN
  ======================================================= */

  async function generateRecommendations() {
    try {
      setGeneratingRecommendations(
        true
      );

      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired."
        );
      }

      const response =
        await fetch(
          "/api/ai/recommendations",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({}),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not generate study recommendations."
        );
      }

      await loadDashboard();
    } catch (err) {
      console.error(
        "Recommendation generation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not generate study recommendations."
      );
    } finally {
      setGeneratingRecommendations(
        false
      );
    }
  }

  /* =======================================================
     COMPLETE RECOMMENDATION
  ======================================================= */

  async function handleCompleteRecommendation(
    id: string
  ) {
    try {
      setActionId(id);

      await completeStudyRecommendation(
        id
      );

      setRecommendations(
        (current) =>
          current.map(
            (recommendation) =>
              recommendation.id === id
                ? {
                    ...recommendation,
                    completed: true,
                  }
                : recommendation
          )
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not complete recommendation."
      );
    } finally {
      setActionId(null);
    }
  }

  /* =======================================================
     DELETE RECOMMENDATION
  ======================================================= */

  async function handleDeleteRecommendation(
    id: string
  ) {
    try {
      setActionId(id);

      await deleteStudyRecommendation(
        id
      );

      setRecommendations(
        (current) =>
          current.filter(
            (recommendation) =>
              recommendation.id !== id
          )
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not delete recommendation."
      );
    } finally {
      setActionId(null);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/[0.06]">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
            </div>

            <p className="mt-4 text-sm font-medium text-white/60">
              Loading StudySpace
            </p>

            <p className="mt-1 text-xs text-white/25">
              Preparing your workspace...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] space-y-8 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-violet-600/[0.08] blur-3xl" />

          <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-purple-500/[0.06] blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-violet-300/80">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>

                Your academic workspace
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-[42px]">
                {getGreeting()},{" "}
                <span className="text-white/45">
                  {userName}
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/40">
                Here&apos;s what deserves your
                attention today. Your courses,
                deadlines, schedule, and AI study
                plan are all in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-xs font-medium text-white/70 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.06] p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-200">
                Something went wrong
              </p>

              <p className="mt-1 text-xs leading-5 text-red-200/50">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="text-red-200/40 transition hover:text-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* =================================================
            STATS
        ================================================= */}

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] lg:grid-cols-4">
          <Stat
            icon={
              <BookOpen className="h-4 w-4 text-violet-300" />
            }
            value={courses.length}
            label="Active courses"
            detail="courses"
            iconClass="bg-violet-500/10"
          />

          <Stat
            icon={
              <Target className="h-4 w-4 text-cyan-300" />
            }
            value={`${averageProgress}%`}
            label="Average progress"
            detail="overall"
            iconClass="bg-cyan-500/10"
          />

          <Stat
            icon={
              <ListChecks className="h-4 w-4 text-orange-300" />
            }
            value={activeAssignments.length}
            label="Active assignments"
            detail="active"
            iconClass="bg-orange-500/10"
          />

          <Stat
            icon={
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            }
            value={completedAssignments.length}
            label="Completed assignments"
            detail="done"
            iconClass="bg-emerald-500/10"
          />
        </section>

        {/* =================================================
            AI STUDY PLAN
        ================================================= */}

        <section className="relative overflow-hidden rounded-2xl border border-violet-400/[0.12] bg-[#0d0a15]">

          <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-violet-600/[0.08] blur-3xl" />

          <div className="relative border-b border-white/[0.06] px-5 py-5 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/[0.08]">
                  <Brain className="h-5 w-5 text-violet-300" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
                      Your focus for today
                    </h2>

                    <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-300">
                      AI powered
                    </span>
                  </div>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
                    StudySpace looks at your workload,
                    deadlines, courses, quizzes, homework,
                    and schedule to figure out what deserves
                    your attention next.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  generateRecommendations
                }
                disabled={
                  generatingRecommendations
                }
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingRecommendations ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate study plan
                  </>
                )}
              </button>
            </div>
          </div>

          {activeRecommendations.length ===
          0 ? (
            <div className="relative px-6 py-14 text-center sm:py-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/[0.07]">
                <Sparkles className="h-6 w-6 text-violet-300" />
              </div>

              <h3 className="mt-5 text-base font-semibold text-white">
                Your study plan is waiting
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
                Let StudySpace analyze your current
                academic workload and turn it into
                a focused list of things to work on.
              </p>

              <button
                type="button"
                onClick={
                  generateRecommendations
                }
                disabled={
                  generatingRecommendations
                }
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-violet-400/15 bg-violet-500/[0.07] px-4 py-2.5 text-xs font-medium text-violet-200 transition hover:bg-violet-500/[0.12] disabled:opacity-50"
              >
                <Zap className="h-3.5 w-3.5" />
                Analyze my workload
              </button>
            </div>
          ) : (
            <div className="relative grid gap-3 p-4 sm:p-5 lg:grid-cols-2">

              {activeRecommendations
                .slice(0, 6)
                .map((recommendation) => {
                  const priority =
                    priorityClasses(
                      recommendation.priority
                    );

                  const course =
                    courses.find(
                      (item) =>
                        item.id ===
                        recommendation.course_id
                    );

                  const busy =
                    actionId ===
                    recommendation.id;

                  return (
                    <div
                      key={
                        recommendation.id
                      }
                      className="group rounded-xl border border-white/[0.06] bg-black/20 p-4 transition hover:border-white/[0.11] hover:bg-black/30"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priority.dot}`}
                        />

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-white">
                                {
                                  recommendation.title
                                }
                              </h3>

                              {course && (
                                <p className="mt-1 text-[11px] font-medium text-violet-300/80">
                                  {course.code ||
                                    course.name}
                                </p>
                              )}
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${priority.badge}`}
                            >
                              {priorityLabel(
                                recommendation.priority
                              )}
                            </span>
                          </div>

                          <p className="mt-3 text-xs leading-5 text-white/55">
                            {
                              recommendation.recommendation
                            }
                          </p>

                          {recommendation.reason && (
                            <div className="mt-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                              <p className="text-[11px] leading-5 text-white/30">
                                <span className="font-medium text-white/50">
                                  Why:
                                </span>{" "}
                                {
                                  recommendation.reason
                                }
                              </p>
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-white/25">
                            {recommendation.estimated_minutes && (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3 w-3" />
                                {
                                  recommendation.estimated_minutes
                                }{" "}
                                min
                              </span>
                            )}

                            {recommendation.suggested_date && (
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3" />
                                {formatShortDate(
                                  recommendation.suggested_date
                                )}
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex items-center gap-2 border-t border-white/[0.05] pt-3">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleCompleteRecommendation(
                                  recommendation.id
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/10 bg-emerald-500/[0.06] px-3 py-1.5 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-500/[0.12] disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}

                              Complete
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleDeleteRecommendation(
                                  recommendation.id
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-white/25 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* =================================================
            TODAY + UPCOMING
        ================================================= */}

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">

          {/* TODAY */}

          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0910]">
            <SectionHeader
              title="Today"
              description={
                todayEvents.length
                  ? `${todayEvents.length} event${
                      todayEvents.length ===
                      1
                        ? ""
                        : "s"
                    } scheduled`
                  : "Your schedule for today"
              }
              icon={
                <CalendarDays className="h-4 w-4 text-violet-300" />
              }
            />

            {todayEvents.length ===
            0 ? (
              <EmptyState
                icon={
                  <CalendarDays className="h-5 w-5" />
                }
                title="Your calendar is clear"
                description="Nothing is scheduled for today. Enjoy the breathing room or use it to get ahead."
              />
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {todayEvents.map(
                  (event) => (
                    <div
                      key={event.id}
                      className="group flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.015]"
                    >
                      <div className="w-16 shrink-0 text-right">
                        <p className="text-xs font-medium text-white/60">
                          {formatTime(
                            event.start_at
                          )}
                        </p>

                        <p className="mt-1 text-[10px] text-white/20">
                          {formatTime(
                            event.end_at
                          )}
                        </p>
                      </div>

                      <div
                        className="h-9 w-0.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            event.color ||
                            "#7c3aed",
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/80">
                          {event.title}
                        </p>

                        {event.subtitle && (
                          <p className="mt-1 truncate text-xs text-white/30">
                            {event.subtitle}
                          </p>
                        )}
                      </div>

                      <span className="hidden rounded-md bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-wider text-white/20 sm:inline-flex">
                        {event.event_type}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* UPCOMING */}

          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0910]">
            <SectionHeader
              title="Coming up"
              description="Next 7 days"
              icon={
                <FileText className="h-4 w-4 text-orange-300" />
              }
            />

            {upcomingAssignments.length ===
            0 ? (
              <EmptyState
                icon={
                  <CheckCircle2 className="h-5 w-5" />
                }
                title="Nothing urgent"
                description="You don't have any upcoming assignments in the next seven days."
              />
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {upcomingAssignments.map(
                  (assignment) => {
                    const course =
                      courses.find(
                        (item) =>
                          item.id ===
                          assignment.course_id
                      );

                    return (
                      <div
                        key={
                          assignment.id
                        }
                        className="group px-5 py-4 transition hover:bg-white/[0.015]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white/80">
                              {
                                assignment.title
                              }
                            </p>

                            <p className="mt-1 truncate text-[11px] text-violet-300/70">
                              {course?.code ||
                                "Assignment"}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-md bg-orange-500/[0.07] px-2 py-1 text-[10px] font-medium text-orange-300">
                            {formatShortDate(
                              assignment.due_date
                            )}
                          </span>
                        </div>

                        {assignment.progress !==
                          null && (
                          <div className="mt-3">
                            <ProgressBar
                              value={
                                Number(
                                  assignment.progress
                                ) || 0
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>

        {/* =================================================
            COURSE PROGRESS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0910]">
          <SectionHeader
            title="Course progress"
            description="Your current progress across active courses"
            icon={
              <GraduationCap className="h-4 w-4 text-violet-300" />
            }
          />

          {courses.length ===
          0 ? (
            <EmptyState
              icon={
                <BookOpen className="h-5 w-5" />
              }
              title="No courses yet"
              description="Add your first course to start tracking your academic progress."
            />
          ) : (
            <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
              {courses.map(
                (course) => {
                  const progress =
                    Number(
                      course.progress
                    ) || 0;

                  return (
                    <div
                      key={course.id}
                      className="rounded-xl border border-white/[0.06] bg-black/15 p-4 transition hover:border-white/[0.1] hover:bg-black/25"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: `${
                                course.color ||
                                "#7c3aed"
                              }18`,
                              border: `1px solid ${
                                course.color ||
                                "#7c3aed"
                              }30`,
                            }}
                          >
                            <BookOpen
                              className="h-4 w-4"
                              style={{
                                color:
                                  course.color ||
                                  "#a78bfa",
                              }}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white/80">
                              {course.code ||
                                course.name}
                            </p>

                            <p className="truncate text-[11px] text-white/25">
                              {course.name}
                            </p>
                          </div>
                        </div>

                        <span className="text-sm font-semibold text-violet-300">
                          {progress}%
                        </span>
                      </div>

                      <div className="mt-4">
                        <ProgressBar
                          value={
                            progress
                          }
                        />
                      </div>

                      {course.target_grade !==
                        null && (
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] text-white/20">
                            Target grade
                          </span>

                          <span className="text-[10px] font-medium text-white/40">
                            {
                              course.target_grade
                            }
                            %
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =================================================
            NOTIFICATIONS + AI
        ================================================= */}

        <div className="grid gap-5 lg:grid-cols-2">

          {/* NOTIFICATIONS */}

          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0910]">
            <SectionHeader
              title="Recent notifications"
              description="Updates from StudySpace"
              icon={
                <Sparkles className="h-4 w-4 text-violet-300" />
              }
              action={
                unreadNotifications >
                0 ? (
                  <span className="rounded-full border border-violet-400/10 bg-violet-500/[0.07] px-2 py-1 text-[9px] font-semibold text-violet-300">
                    {unreadNotifications} new
                  </span>
                ) : null
              }
            />

            {notifications.length ===
            0 ? (
              <EmptyState
                icon={<BellEmptyIcon />}
                title="You're all caught up"
                description="New updates and reminders will appear here."
              />
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {notifications
                  .slice(0, 5)
                  .map(
                    (
                      notification
                    ) => (
                      <div
                        key={
                          notification.id
                        }
                        className={`px-5 py-4 transition hover:bg-white/[0.015] ${
                          !notification.read
                            ? "bg-violet-500/[0.015]"
                            : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white/75">
                              {
                                notification.title
                              }
                            </p>

                            <p className="mt-1 text-xs leading-5 text-white/30">
                              {
                                notification.message
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
              </div>
            )}
          </section>

          {/* AI STATUS */}

          <section className="relative overflow-hidden rounded-2xl border border-violet-400/[0.1] bg-[#0d0a15] p-6">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/[0.08] blur-3xl" />

            <div className="relative">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/[0.08]">
                  <Brain className="h-5 w-5 text-violet-300" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    StudySpace AI
                  </p>

                  <p className="mt-0.5 text-[11px] text-white/25">
                    Academic intelligence
                  </p>
                </div>

                <div className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/[0.05] px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active
                </div>
              </div>

              <h3 className="mt-7 text-xl font-semibold tracking-[-0.025em] text-white">
                Your study data is connected.
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/35">
                AI Tutor and Study Recommendations
                can use your courses, assignments,
                quizzes, homework, and calendar to
                provide more relevant help.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <AIDataChip
                  label="Courses"
                  active={
                    courses.length > 0
                  }
                />

                <AIDataChip
                  label="Assignments"
                  active={
                    assignments.length >
                    0
                  }
                />

                <AIDataChip
                  label="Quizzes"
                  active={
                    quizzes.length > 0
                  }
                />

                <AIDataChip
                  label="Homework"
                  active={
                    homework.length > 0
                  }
                />
              </div>
            </div>
          </section>
        </div>

        {/* =================================================
            FOOTER SUMMARY
        ================================================= */}

        <div className="flex flex-col gap-3 border-t border-white/[0.05] pt-5 text-[11px] text-white/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-orange-400/60" />

            {activeRecommendations.length >
            0 ? (
              <span>
                You have{" "}
                <span className="text-white/40">
                  {
                    activeRecommendations.length
                  } active AI recommendation
                  {activeRecommendations.length ===
                  1
                    ? ""
                    : "s"}
                </span>{" "}
                waiting.
              </span>
            ) : (
              <span>
                Generate a study plan when
                you&apos;re ready.
              </span>
            )}
          </div>

          <span>
            {formatDate(
              new Date().toISOString()
            )}
          </span>
        </div>
      </div>
    </AppShell>
  );
}