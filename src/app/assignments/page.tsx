
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import ViewportPortal from "@/components/ViewportPortal";
import { createClient } from "@/lib/supabase/client";

type Course = {
  id: string;
  code: string;
  name: string;
};

type Assignment = {
  id: string;
  user_id: string;
  assigned_to?: string | null;
  course_id: string;
  title: string;
  description: string | null;
  assignment_questions?: string;
  rubric_text?: string;
  unit_name?: string;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  progress: number;
  points: number | null;
  max_points: number | null;
  created_at: string;
  updated_at: string;
  courses?: Course | null;
};

type Filter = "all" | "upcoming" | "overdue" | "completed";

const supabase = createClient();

function formatDate(value: string | null) {
  if (!value) return "No due date";

  const date = new Date(`${value.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "No due date";

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isOverdue(assignment: Assignment) {
  if (!assignment.due_date || assignment.status === "completed") return false;

  const due = new Date(`${assignment.due_date.slice(0, 10)}T23:59:59`);
  return due.getTime() < Date.now();
}

function priorityClass(priority: Assignment["priority"]) {
  if (priority === "high") {
    return "border-red-400/20 bg-red-400/10 text-red-300";
  }

  if (priority === "medium") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-white/10 bg-white/[0.04] text-white/50";
}

function statusClass(status: Assignment["status"]) {
  if (status === "completed") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "in_progress") {
    return "border-purple-400/20 bg-purple-400/10 text-purple-300";
  }

  return "border-white/10 bg-white/[0.04] text-white/50";
}

export default function AssignmentsPage() {
  const router = useRouter();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [courseFilter, setCourseFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignmentQuestions, setAssignmentQuestions] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [unitName, setUnitName] = useState("General");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] =
    useState<Assignment["priority"]>("medium");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      setLoading(true);
      setError("");

      if (authError) throw authError;

      if (!user) {
        router.replace("/login");
        return;
      }

      const [assignmentResult, courseResult] = await Promise.all([
        supabase
          .from("assignments")
          .select(
            "id, user_id, assigned_to, course_id, title, description, assignment_questions, rubric_text, unit_name, due_date, priority, status, progress, points, max_points, created_at, updated_at",
          )
          .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
          .order("due_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("courses")
          .select("id, code, name")
          .eq("user_id", user.id)
          .order("code", { ascending: true }),
      ]);

      if (assignmentResult.error) throw assignmentResult.error;
      if (courseResult.error) throw courseResult.error;

      const ownCourses = (courseResult.data ?? []) as Course[];
      const assignmentCourseIds = [...new Set((assignmentResult.data ?? []).map((item) => item.course_id).filter(Boolean))];
      const extraCourseResult = assignmentCourseIds.length ? await supabase.from("courses").select("id, code, name").in("id", assignmentCourseIds) : { data: [], error: null };
      const courseList = [...new Map([...ownCourses, ...((extraCourseResult.data ?? []) as Course[])].map((course) => [course.id, course])).values()];
      const courseMap = new Map(courseList.map((course) => [course.id, course]));

      const assignmentList = (assignmentResult.data ?? []).map((item) => ({
        ...(item as Omit<Assignment, "courses">),
        courses: courseMap.get(item.course_id) ?? null,
      })) as Assignment[];

      setCourses(courseList);
      setAssignments(assignmentList);
    } catch (err) {
      console.error("Failed to load assignments:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't load your assignments. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  useEffect(() => {
    const channel = supabase.channel("student-assignments-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => { void loadData(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions" }, () => { void loadData(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadData]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch =
        !query ||
        assignment.title.toLowerCase().includes(query) ||
        (assignment.description ?? "").toLowerCase().includes(query) ||
        (assignment.courses?.name ?? "").toLowerCase().includes(query) ||
        (assignment.courses?.code ?? "").toLowerCase().includes(query);

      const matchesCourse =
        courseFilter === "all" || assignment.course_id === courseFilter;

      let matchesFilter = true;

      if (filter === "completed") {
        matchesFilter = assignment.status === "completed";
      } else if (filter === "overdue") {
        matchesFilter = isOverdue(assignment);
      } else if (filter === "upcoming") {
        matchesFilter =
          assignment.status !== "completed" && !isOverdue(assignment);
      }

      return matchesSearch && matchesCourse && matchesFilter;
    });
  }, [assignments, search, filter, courseFilter]);

  const stats = useMemo(() => {
    const completed = assignments.filter(
      (assignment) => assignment.status === "completed",
    ).length;

    const overdue = assignments.filter(isOverdue).length;

    const inProgress = assignments.filter(
      (assignment) => assignment.status === "in_progress",
    ).length;

    return {
      total: assignments.length,
      completed,
      overdue,
      inProgress,
    };
  }, [assignments]);

  async function createAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");

    if (!title.trim()) {
      setCreateError("Enter an assignment title.");
      return;
    }

    if (!courseId) {
      setCreateError("Choose a course for this assignment.");
      return;
    }

    setCreating(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { error: insertError } = await supabase
        .from("assignments")
        .insert({
          user_id: user.id,
          course_id: courseId,
          title: title.trim(),
          description: description.trim() || null,
          assignment_questions: assignmentQuestions.trim(),
          rubric_text: rubricText.trim(),
          unit_name: unitName.trim() || "General",
          due_date: dueDate || null,
          priority,
          status: "pending",
          progress: 0,
        });

      if (insertError) throw insertError;

      setTitle("");
      setDescription("");
      setAssignmentQuestions("");
      setRubricText("");
      setUnitName("General");
      setCourseId("");
      setDueDate("");
      setPriority("medium");
      setShowCreate(false);

      await loadData();
    } catch (err) {
      console.error("Failed to create assignment:", err);
      setCreateError(
        err instanceof Error
          ? err.message
          : "Couldn't create the assignment.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function updateProgress(
    assignment: Assignment,
    progress: number,
  ) {
    const nextProgress = Math.max(0, Math.min(100, progress));
    const nextStatus: Assignment["status"] =
      nextProgress === 100
        ? "completed"
        : nextProgress > 0
          ? "in_progress"
          : "pending";

    const previous = assignments;

    setAssignments((current) =>
      current.map((item) =>
        item.id === assignment.id
          ? { ...item, progress: nextProgress, status: nextStatus }
          : item,
      ),
    );

    setUpdatingId(assignment.id);

    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        progress: nextProgress,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id)
      .eq("user_id", assignment.user_id);

    if (updateError) {
      console.error("Failed to update progress:", updateError);
      setAssignments(previous);
      setError(`Couldn't update progress: ${updateError.message}`);
    }

    setUpdatingId(null);
  }

  async function deleteAssignment(assignment: Assignment) {
    const confirmed = window.confirm(
      `Delete "${assignment.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(assignment.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignment.id)
      .eq("user_id", assignment.user_id);

    if (deleteError) {
      console.error("Failed to delete assignment:", deleteError);
      setError(`Couldn't delete assignment: ${deleteError.message}`);
      setDeletingId(null);
      return;
    }

    setAssignments((current) =>
      current.filter((item) => item.id !== assignment.id),
    );
    setDeletingId(null);
  }

  if (loading) {
    return (
      <AppShell title="Assignments" description="Organize your deadlines and keep your coursework moving.">
        <main className="min-h-[calc(100vh-80px)] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 py-32 text-sm text-white/45">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading assignments...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell title="Assignments" description="Organize your deadlines and keep your coursework moving.">
      <main className="min-h-[calc(100vh-80px)] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-purple-300/80">
              Stay on track
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Assignments
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Organize your deadlines and keep your coursework moving.
            </p>
          </div>

          <button
            onClick={() => {
              setCreateError("");
              setShowCreate(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-400"
          >
            <Plus className="h-4 w-4" />
            New assignment
          </button>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{error}</p>
              <button
                onClick={() => void loadData()}
                className="mt-2 font-medium underline underline-offset-4"
              >
                Try again
              </button>
            </div>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total assignments",
              value: stats.total,
              icon: BookOpen,
              color: "text-purple-300",
            },
            {
              label: "In progress",
              value: stats.inProgress,
              icon: Clock3,
              color: "text-sky-300",
            },
            {
              label: "Completed",
              value: stats.completed,
              icon: CheckCircle2,
              color: "text-emerald-300",
            },
            {
              label: "Overdue",
              value: stats.overdue,
              icon: CalendarDays,
              color: "text-red-300",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-white/45 sm:text-sm">
                    {stat.label}
                  </p>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input type="search" aria-label="Search assignments" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assignments or courses..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple-400/50"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#17151d] px-3.5 py-3 text-sm text-white/70 outline-none focus:border-purple-400/50"
          >
            <option value="all">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["all", "All assignments"],
              ["upcoming", "Upcoming"],
              ["overdue", "Overdue"],
              ["completed", "Completed"],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-lg border px-3.5 py-2 text-sm transition ${
                filter === value
                  ? "border-purple-400/30 bg-purple-400/10 text-purple-200"
                  : "border-white/10 bg-white/[0.02] text-white/45 hover:bg-white/[0.05] hover:text-white/75"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {filteredAssignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <BookOpen className="h-5 w-5 text-white/40" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-white">
                {assignments.length === 0
                  ? "No assignments yet"
                  : "No matching assignments"}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/40">
                {assignments.length === 0
                  ? "Add your first assignment to keep track of deadlines, priorities, and progress."
                  : "Try a different search or filter to see your assignments."}
              </p>
              {assignments.length === 0 && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-purple-400"
                >
                  <Plus className="h-4 w-4" />
                  Create assignment
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredAssignments.map((assignment) => {
                const overdue = isOverdue(assignment);

                return (
                  <article
                    key={assignment.id}
                    className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 transition hover:border-white/[0.16] sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {assignment.courses && (
                            <Link
                              href={`/courses/${assignment.course_id}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-white/55 transition hover:text-white"
                            >
                              <BookOpen className="h-3 w-3" />
                              {assignment.courses.code}
                            </Link>
                          )}

                          <span
                            className={`rounded-md border px-2 py-1 text-xs ${priorityClass(assignment.priority)}`}
                          >
                            {assignment.priority.charAt(0).toUpperCase() +
                              assignment.priority.slice(1)}{" "}
                            priority
                          </span>

                          <span
                            className={`rounded-md border px-2 py-1 text-xs ${statusClass(assignment.status)}`}
                          >
                            {assignment.status === "completed"
                              ? "Completed"
                              : assignment.status === "in_progress"
                                ? "In progress"
                                : "Not started"}
                          </span>
                        </div>

                        <Link
                          href={`/assignments/${assignment.id}`}
                          className="group mt-3 inline-flex max-w-full items-center gap-2"
                        >
                          <h2 className="truncate text-base font-semibold text-white transition group-hover:text-purple-200 sm:text-lg">
                            {assignment.title}
                          </h2>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-white/25 transition group-hover:text-purple-200" />
                        </Link>

                        {assignment.description && (
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/40">
                            {assignment.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/40">
                          <span
                            className={`inline-flex items-center gap-1.5 ${overdue ? "text-red-300" : ""}`}
                          >
                            <CalendarDays className="h-3.5 w-3.5" />
                            {overdue
                              ? `Overdue · ${formatDate(assignment.due_date)}`
                              : formatDate(assignment.due_date)}
                          </span>

                          {assignment.courses && (
                            <span className="truncate">
                              {assignment.courses.name}
                            </span>
                          )}

                          {assignment.max_points !== null && (
                            <span>
                              {assignment.points ?? "—"} /{" "}
                              {assignment.max_points} points
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                        <Link
                          href={`/assignments/${assignment.id}`}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/65 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => void deleteAssignment(assignment)}
                          disabled={deletingId === assignment.id}
                          title="Delete assignment"
                          aria-label={`Delete ${assignment.title}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/35 transition hover:border-red-400/20 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40"
                        >
                          {deletingId === assignment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-white/[0.07] pt-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label
                          htmlFor={`progress-${assignment.id}`}
                          className="text-xs text-white/40"
                        >
                          Progress
                        </label>
                        <span className="text-xs font-medium tabular-nums text-white/65">
                          {assignment.progress}%
                          {updatingId === assignment.id ? " · Saving..." : ""}
                        </span>
                      </div>

                      <input
                        id={`progress-${assignment.id}`}
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={assignment.progress}
                        disabled={updatingId === assignment.id}
                        onChange={(event) =>
                          void updateProgress(
                            assignment,
                            Number(event.target.value),
                          )
                        }
                        className="w-full cursor-pointer accent-purple-400 disabled:opacity-50"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <ViewportPortal>
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating) {
              setShowCreate(false);
            }
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#17151d] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  New assignment
                </h2>
                <p className="mt-1 text-sm text-white/40">
                  Add the details so you can keep track of your work.
                </p>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                aria-label="Close"
                className="rounded-lg p-1 text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100/80">
                You need to create a course before adding an assignment.
                <Link
                  href="/courses"
                  className="ml-1 font-medium text-amber-100 underline underline-offset-4"
                >
                  Go to Courses
                </Link>
              </div>
            ) : (
              <form onSubmit={createAssignment} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="assignment-title"
                    className="mb-1.5 block text-sm text-white/65"
                  >
                    Title
                  </label>
                  <input id="assignment-title" value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    maxLength={200}
                    placeholder="e.g. Research paper"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="assignment-course"
                    className="mb-1.5 block text-sm text-white/65"
                  >
                    Course
                  </label>
                  <select
                    id="assignment-course"
                    value={courseId}
                    onChange={(event) => setCourseId(event.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#211e29] px-3.5 py-3 text-sm text-white outline-none focus:border-purple-400/50"
                  >
                    <option value="">Choose a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="assignment-description"
                    className="mb-1.5 block text-sm text-white/65"
                  >
                    Description <span className="text-white/30">(optional)</span>
                  </label>
                  <textarea
                    id="assignment-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    maxLength={5000}
                    placeholder="What do you need to complete?"
                    className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/50"
                  />
                </div>

                <div>
                  <label htmlFor="assignment-unit" className="mb-1.5 block text-sm text-white/65">Unit / chapter</label>
                  <input id="assignment-unit" maxLength={100} value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="e.g. Unit 3 — Photosynthesis" className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/50" />
                </div>

                <div>
                  <label htmlFor="assignment-questions" className="mb-1.5 block text-sm text-white/65">Assignment questions & required work</label>
                  <textarea id="assignment-questions" value={assignmentQuestions} onChange={(event) => setAssignmentQuestions(event.target.value)} rows={4} maxLength={12000} placeholder="Paste the exact questions, task instructions, required sections, and submission requirements. You can also attach the assignment PDF after creating it." className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/50" />
                </div>

                <div>
                  <label htmlFor="assignment-rubric" className="mb-1.5 block text-sm text-white/65">Rubric / marking criteria <span className="text-white/30">(optional)</span></label>
                  <textarea id="assignment-rubric" value={rubricText} onChange={(event) => setRubricText(event.target.value)} rows={3} maxLength={12000} placeholder="Paste the marking rubric, point breakdown, and criteria the AI should follow." className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/50" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="assignment-due"
                      className="mb-1.5 block text-sm text-white/65"
                    >
                      Due date
                    </label>
                    <input id="assignment-due" type="date" required value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-sm text-white outline-none focus:border-purple-400/50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="assignment-priority"
                      className="mb-1.5 block text-sm text-white/65"
                    >
                      Priority
                    </label>
                    <select
                      id="assignment-priority"
                      value={priority}
                      onChange={(event) =>
                        setPriority(
                          event.target.value as Assignment["priority"],
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#211e29] px-3 py-3 text-sm text-white outline-none focus:border-purple-400/50"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {createError && (
                  <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
                    {createError}
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    disabled={creating}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating || courses.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create assignment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        </ViewportPortal>
      )}
      </main>
    </AppShell>
  );
}
