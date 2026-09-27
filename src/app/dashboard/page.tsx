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

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

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
      Date.now() +
        7 * 24 * 60 * 60 * 1000
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
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
        style={{
          width: `${safeValue}%`,
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] =
    useState(true);

  const [generatingRecommendations, setGeneratingRecommendations] =
    useState(false);

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

          /*
           * IMPORTANT:
           * quizzes.topic is NOT queried because
           * that column does not exist in your schema.
           */
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
    const timeout = window.setTimeout(
      loadDashboard,
      0
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadDashboard]);

  /*
   * Refresh dashboard periodically so the
   * study plan and workload don't become stale.
   */

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

  /*
   * -------------------------------------------------------
   * DERIVED DATA
   * -------------------------------------------------------
   */

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

  /*
   * -------------------------------------------------------
   * GENERATE AI STUDY PLAN
   * -------------------------------------------------------
   */

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

  /*
   * -------------------------------------------------------
   * COMPLETE RECOMMENDATION
   * -------------------------------------------------------
   */

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
                    completed:
                      true,
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

  /*
   * -------------------------------------------------------
   * DELETE RECOMMENDATION
   * -------------------------------------------------------
   */

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

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-white/50">
            <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
            Loading your StudySpace...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">

        {/* ------------------------------------------------ */}
        {/* HEADER */}
        {/* ------------------------------------------------ */}

        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
                <Sparkles className="h-4 w-4" />
                StudySpace
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {getGreeting()},{" "}
                <span className="text-violet-300">
                  {userName}
                </span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                Here&apos;s what is happening across
                your courses, workload, schedule,
                and study plan.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </section>

        {/* ------------------------------------------------ */}
        {/* ERROR */}
        {/* ------------------------------------------------ */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-medium">
                Something went wrong
              </p>

              <p className="mt-1 text-red-200/60">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="text-red-200/50 transition hover:text-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* STATS */}
        {/* ------------------------------------------------ */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-violet-500/10 p-2.5">
                <BookOpen className="h-5 w-5 text-violet-400" />
              </div>

              <TrendingUp className="h-4 w-4 text-white/20" />
            </div>

            <p className="mt-5 text-3xl font-semibold text-white">
              {courses.length}
            </p>

            <p className="mt-1 text-sm text-white/40">
              Active courses
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-cyan-500/10 p-2.5">
                <Target className="h-5 w-5 text-cyan-400" />
              </div>

              <span className="text-xs text-white/30">
                overall
              </span>
            </div>

            <p className="mt-5 text-3xl font-semibold text-white">
              {averageProgress}%
            </p>

            <p className="mt-1 text-sm text-white/40">
              Average course progress
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-orange-500/10 p-2.5">
                <ListChecks className="h-5 w-5 text-orange-400" />
              </div>

              <span className="text-xs text-white/30">
                active
              </span>
            </div>

            <p className="mt-5 text-3xl font-semibold text-white">
              {activeAssignments.length}
            </p>

            <p className="mt-1 text-sm text-white/40">
              Active assignments
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-emerald-500/10 p-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>

              <span className="text-xs text-white/30">
                total
              </span>
            </div>

            <p className="mt-5 text-3xl font-semibold text-white">
              {completedAssignments.length}
            </p>

            <p className="mt-1 text-sm text-white/40">
              Completed assignments
            </p>
          </div>
        </section>

        {/* ------------------------------------------------ */}
        {/* AI STUDY PLAN */}
        {/* ------------------------------------------------ */}

        <section className="overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] via-white/[0.025] to-fuchsia-500/[0.05] shadow-xl shadow-violet-950/10">
          <div className="border-b border-white/[0.07] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-violet-500/15 p-3">
                  <Brain className="h-6 w-6 text-violet-300" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-white">
                      Your Study Plan
                    </h2>

                    <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-300">
                      AI powered
                    </span>
                  </div>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
                    Recommendations based on your
                    actual courses, deadlines,
                    quizzes, homework, and schedule.
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
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingRecommendations ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate study plan
                  </>
                )}
              </button>
            </div>
          </div>

          {activeRecommendations.length ===
          0 ? (
            <div className="p-8 text-center sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/[0.08]">
                <Sparkles className="h-7 w-7 text-violet-300" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-white">
                No active study recommendations
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
                Let StudySpace analyze your current
                workload and build a personalized
                study plan.
              </p>

              <button
                type="button"
                onClick={
                  generateRecommendations
                }
                disabled={
                  generatingRecommendations
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-200 transition hover:bg-violet-500/15 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                Analyze my workload
              </button>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
              {activeRecommendations
                .slice(0, 6)
                .map(
                  (recommendation) => {
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
                        className="group rounded-2xl border border-white/[0.07] bg-black/20 p-4 transition hover:border-white/[0.12] hover:bg-black/30"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${priority.dot}`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-white">
                                  {
                                    recommendation.title
                                  }
                                </h3>

                                {course && (
                                  <p className="mt-1 text-xs text-violet-300">
                                    {course.code ||
                                      course.name}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${priority.badge}`}
                              >
                                {priorityLabel(
                                  recommendation.priority
                                )}
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-white/65">
                              {
                                recommendation.recommendation
                              }
                            </p>

                            {recommendation.reason && (
                              <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2.5">
                                <p className="text-xs leading-5 text-white/40">
                                  <span className="font-medium text-white/55">
                                    Why:
                                  </span>{" "}
                                  {
                                    recommendation.reason
                                  }
                                </p>
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/35">
                              {recommendation.estimated_minutes && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {
                                    recommendation.estimated_minutes
                                  }{" "}
                                  min
                                </span>
                              )}

                              {recommendation.suggested_date && (
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {formatShortDate(
                                    recommendation.suggested_date
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  handleCompleteRecommendation(
                                    recommendation.id
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.07] px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
                              >
                                {busy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Complete
                              </button>

                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  handleDeleteRecommendation(
                                    recommendation.id
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white/30 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
            </div>
          )}
        </section>

        {/* ------------------------------------------------ */}
        {/* MAIN GRID */}
        {/* ------------------------------------------------ */}

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">

          {/* TODAY */}
          <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025]">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
              <div>
                <h2 className="font-semibold text-white">
                  Today&apos;s schedule
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  {todayEvents.length
                    ? `${todayEvents.length} event${todayEvents.length === 1 ? "" : "s"} today`
                    : "Nothing scheduled today"}
                </p>
              </div>

              <CalendarDays className="h-5 w-5 text-violet-400" />
            </div>

            {todayEvents.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-white/15" />

                <p className="mt-3 text-sm text-white/40">
                  Your calendar is clear today.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {todayEvents.map(
                  (event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 p-4"
                    >
                      <div className="w-20 shrink-0 text-right">
                        <p className="text-xs font-medium text-white/60">
                          {formatTime(
                            event.start_at
                          )}
                        </p>

                        <p className="mt-1 text-[10px] text-white/25">
                          {formatTime(
                            event.end_at
                          )}
                        </p>
                      </div>

                      <div
                        className="h-10 w-1 rounded-full"
                        style={{
                          backgroundColor:
                            event.color ||
                            "#7c3aed",
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {event.title}
                        </p>

                        {event.subtitle && (
                          <p className="mt-1 truncate text-xs text-white/35">
                            {event.subtitle}
                          </p>
                        )}
                      </div>

                      <span className="hidden rounded-full bg-white/[0.04] px-2 py-1 text-[10px] text-white/30 sm:inline-flex">
                        {event.event_type}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* UPCOMING */}
          <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025]">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
              <div>
                <h2 className="font-semibold text-white">
                  Coming up
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Next 7 days
                </p>
              </div>

              <FileText className="h-5 w-5 text-orange-400" />
            </div>

            {upcomingAssignments.length ===
            0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400/30" />

                <p className="mt-3 text-sm text-white/40">
                  No upcoming assignments.
                </p>
              </div>
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
                        className="p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {
                                assignment.title
                              }
                            </p>

                            <p className="mt-1 text-xs text-violet-300">
                              {course?.code ||
                                "Assignment"}
                            </p>
                          </div>

                          <span className="shrink-0 text-xs text-orange-300">
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

        {/* ------------------------------------------------ */}
        {/* COURSE PROGRESS */}
        {/* ------------------------------------------------ */}

        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
            <div>
              <h2 className="font-semibold text-white">
                Course progress
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Your current progress across active courses
              </p>
            </div>

            <GraduationCap className="h-5 w-5 text-violet-400" />
          </div>

          {courses.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-white/15" />

              <p className="mt-3 text-sm text-white/40">
                Add a course to start tracking progress.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                const progress =
                  Number(
                    course.progress
                  ) || 0;

                return (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-white/[0.06] bg-black/15 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="h-9 w-9 shrink-0 rounded-xl"
                          style={{
                            backgroundColor:
                              `${course.color || "#7c3aed"}25`,
                            border: `1px solid ${course.color || "#7c3aed"}40`,
                          }}
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {course.code ||
                              course.name}
                          </p>

                          <p className="truncate text-xs text-white/35">
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
                      <p className="mt-2 text-[11px] text-white/30">
                        Target grade:{" "}
                        {
                          course.target_grade
                        }
                        %
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ------------------------------------------------ */}
        {/* NOTIFICATIONS + AI STATUS */}
        {/* ------------------------------------------------ */}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Notifications */}
          <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025]">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-white">
                    Recent notifications
                  </h2>

                  {unreadNotifications >
                    0 && (
                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                      {
                        unreadNotifications
                      }{" "}
                      new
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-white/35">
                  Updates from StudySpace
                </p>
              </div>

              <ArrowRight className="h-4 w-4 text-white/20" />
            </div>

            {notifications.length ===
            0 ? (
              <div className="p-8 text-center">
                <BellEmptyIcon />

                <p className="mt-3 text-sm text-white/40">
                  You&apos;re all caught up.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {notifications
                  .slice(0, 5)
                  .map(
                    (notification) => (
                      <div
                        key={
                          notification.id
                        }
                        className={`p-4 ${
                          !notification.read
                            ? "bg-violet-500/[0.025]"
                            : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5">
                            <div className="h-2 w-2 rounded-full bg-violet-400" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white">
                              {
                                notification.title
                              }
                            </p>

                            <p className="mt-1 text-xs leading-5 text-white/35">
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

          {/* AI status */}
          <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-500/15 p-2.5">
                  <Brain className="h-5 w-5 text-violet-300" />
                </div>

                <div>
                  <p className="font-semibold text-white">
                    StudySpace AI
                  </p>

                  <p className="text-xs text-white/35">
                    Academic intelligence
                  </p>
                </div>

                <div className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/[0.06] px-2.5 py-1 text-[10px] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active
                </div>
              </div>

              <h3 className="mt-6 text-xl font-semibold text-white">
                Your study data is connected.
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/40">
                AI Tutor and Study Recommendations
                can use your courses, notes,
                assignments, quizzes, homework,
                and calendar to provide more
                relevant help.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <AIDataChip
                  label="Courses"
                  active={courses.length > 0}
                />

                <AIDataChip
                  label="Assignments"
                  active={
                    assignments.length > 0
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

        {/* ------------------------------------------------ */}
        {/* FOOTER SUMMARY */}
        {/* ------------------------------------------------ */}

        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400/70" />

            {activeRecommendations.length >
            0 ? (
              <span>
                You have{" "}
                <span className="text-white/50">
                  {
                    activeRecommendations.length
                  }{" "}
                  active AI recommendation
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

function AIDataChip({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2">
      <div
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
    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
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