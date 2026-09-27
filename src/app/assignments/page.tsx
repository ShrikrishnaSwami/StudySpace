"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Filter,
  Flag,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Course = {
  id: string;
  code: string;
  name: string;
};

type Assignment = {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  description: string | null;
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

type FilterType = "all" | "upcoming" | "overdue" | "completed";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      const [assignmentResult, courseResult] = await Promise.all([
        supabase
          .from("assignments")
          .select(`
            *,
            courses (
              id,
              code,
              name
            )
          `)
          .eq("user_id", user.id)
          .order("due_date", { ascending: true }),

        supabase
          .from("courses")
          .select("id, code, name")
          .eq("user_id", user.id)
          .eq("archived", false)
          .order("name"),
      ]);

      if (cancelled) return;

      if (assignmentResult.error) {
        console.error(
          "Error loading assignments:",
          assignmentResult.error
        );
      }

      if (courseResult.error) {
        console.error(
          "Error loading courses:",
          courseResult.error
        );
      }

      setAssignments(
        (assignmentResult.data as Assignment[]) || []
      );

      setCourses(courseResult.data || []);
      setLoading(false);
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  function isOverdue(assignment: Assignment) {
    if (!assignment.due_date) return false;
    if (assignment.status === "completed") return false;

    return new Date(assignment.due_date) < new Date();
  }

  const filteredAssignments = assignments.filter((assignment) => {
    const query = search.toLowerCase().trim();

    const matchesSearch =
      !query ||
      assignment.title.toLowerCase().includes(query) ||
      assignment.description?.toLowerCase().includes(query) ||
      assignment.courses?.name?.toLowerCase().includes(query) ||
      assignment.courses?.code?.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filter === "completed") {
      return assignment.status === "completed";
    }

    if (filter === "overdue") {
      return isOverdue(assignment);
    }

    if (filter === "upcoming") {
      return (
        assignment.status !== "completed" &&
        !isOverdue(assignment)
      );
    }

    return true;
  });

  const total = assignments.length;

  const completed = assignments.filter(
    (assignment) => assignment.status === "completed"
  ).length;

  const overdue = assignments.filter(isOverdue).length;

  const upcoming = assignments.filter(
    (assignment) =>
      assignment.status !== "completed" &&
      !isOverdue(assignment)
  ).length;

  async function updateAssignment(
    id: string,
    changes: Partial<Assignment>
  ) {
    const { error } = await supabase
      .from("assignments")
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating assignment:", error);
      return;
    }

    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === id
          ? { ...assignment, ...changes }
          : assignment
      )
    );
  }

  async function deleteAssignment(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this assignment?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setAssignments((current) =>
      current.filter((assignment) => assignment.id !== id)
    );
  }

  function handleCreated(assignment: Assignment) {
    setAssignments((current) =>
      [...current, assignment].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;

        return (
          new Date(a.due_date).getTime() -
          new Date(b.due_date).getTime()
        );
      })
    );

    setShowCreate(false);
  }

  return (
    <AppShell
      title="Assignments"
      description="Track everything you need to get done."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-violet-400">
              <CheckCircle2 size={16} />
              Academic workload
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Assignments
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/45">
              Keep track of deadlines, progress, priorities, and
              everything you need to finish.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <Plus size={17} />
            New assignment
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total"
            value={total}
            icon={<CalendarDays size={18} />}
          />

          <StatCard
            label="Upcoming"
            value={upcoming}
            icon={<Clock3 size={18} />}
          />

          <StatCard
            label="Overdue"
            value={overdue}
            icon={<Flag size={18} />}
            danger={overdue > 0}
          />

          <StatCard
            label="Completed"
            value={completed}
            icon={<Check size={18} />}
          />
        </div>

        {/* Search + filters */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search assignments or courses..."
                className="w-full rounded-xl border border-white/[0.07] bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-500/50"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </FilterButton>

              <FilterButton
                active={filter === "upcoming"}
                onClick={() => setFilter("upcoming")}
              >
                Upcoming
              </FilterButton>

              <FilterButton
                active={filter === "overdue"}
                onClick={() => setFilter("overdue")}
              >
                Overdue
              </FilterButton>

              <FilterButton
                active={filter === "completed"}
                onClick={() => setFilter("completed")}
              >
                Completed
              </FilterButton>
            </div>
          </div>
        </div>

        {/* Assignment content */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2
              size={26}
              className="animate-spin text-violet-400"
            />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <EmptyState
            hasAssignments={assignments.length > 0}
            onCreate={() => setShowCreate(true)}
          />
        ) : (
          <div className="space-y-3">
            {filteredAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                overdue={isOverdue(assignment)}
                onUpdate={updateAssignment}
                onDelete={deleteAssignment}
              />
            ))}
          </div>
        )}

        {showCreate && (
          <CreateAssignmentModal
            courses={courses}
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
          />
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  danger = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          danger
            ? "bg-red-500/10 text-red-400"
            : "bg-violet-500/10 text-violet-400"
        }`}
      >
        {icon}
      </div>

      <p className="mt-4 text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/35">{label}</p>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-violet-500/15 text-violet-300"
          : "text-white/40 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function AssignmentCard({
  assignment,
  overdue,
  onUpdate,
  onDelete,
}: {
  assignment: Assignment;
  overdue: boolean;
  onUpdate: (
    id: string,
    changes: Partial<Assignment>
  ) => void;
  onDelete: (id: string) => void;
}) {
  const dueDate = assignment.due_date
    ? new Date(assignment.due_date)
    : null;

  const priorityStyles = {
    low: "bg-blue-500/10 text-blue-300",
    medium: "bg-amber-500/10 text-amber-300",
    high: "bg-red-500/10 text-red-300",
  };

  const completed = assignment.status === "completed";

  return (
    <div
      className={`group rounded-2xl border p-5 transition ${
        overdue
          ? "border-red-500/20 bg-red-500/[0.025]"
          : "border-white/[0.07] bg-white/[0.025] hover:border-violet-500/20"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        {/* Complete button */}
        <button
          onClick={() =>
            onUpdate(assignment.id, {
              status: completed ? "pending" : "completed",
              progress: completed ? 0 : 100,
            })
          }
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
            completed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-white/10 text-white/20 hover:border-violet-400/40 hover:text-violet-300"
          }`}
        >
          {completed && <Check size={19} />}
        </button>

        {/* Information */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {assignment.courses && (
              <Link
                href={`/courses/${assignment.course_id}`}
                className="text-xs font-semibold uppercase tracking-wider text-violet-400 hover:text-violet-300"
              >
                {assignment.courses.code}
              </Link>
            )}

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${priorityStyles[assignment.priority]}`}
            >
              {assignment.priority}
            </span>

            {overdue && (
              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                Overdue
              </span>
            )}
          </div>

          <h3
            className={`mt-2 text-base font-semibold ${
              completed
                ? "text-white/35 line-through"
                : "text-white"
            }`}
          >
            {assignment.title}
          </h3>

          {assignment.description && (
            <p className="mt-1 line-clamp-1 text-sm text-white/35">
              {assignment.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/35">
            {dueDate && (
              <span
                className={`flex items-center gap-1.5 ${
                  overdue ? "text-red-400" : ""
                }`}
              >
                <CalendarDays size={14} />

                {dueDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}

            {assignment.max_points !== null && (
              <span>
                {assignment.points ?? 0}/{assignment.max_points} pts
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="w-full lg:w-44">
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-white/30">Progress</span>

            <span className="text-white/60">
              {assignment.progress}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{
                width: `${assignment.progress}%`,
              }}
            />
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={assignment.progress}
            onChange={(event) => {
              const progress = Number(event.target.value);

              onUpdate(assignment.id, {
                progress,
                status:
                  progress === 100
                    ? "completed"
                    : progress > 0
                      ? "in_progress"
                      : "pending",
              });
            }}
            className="mt-2 w-full accent-violet-500"
          />
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(assignment.id)}
          className="self-end rounded-lg p-2 text-white/20 transition hover:bg-red-500/10 hover:text-red-400 lg:self-center"
          title="Delete assignment"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  hasAssignments,
  onCreate,
}: {
  hasAssignments: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 text-center">
      <div className="rounded-2xl bg-violet-500/10 p-4 text-violet-400">
        <Filter size={25} />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-white">
        {hasAssignments
          ? "No assignments match your filters"
          : "No assignments yet"}
      </h3>

      <p className="mt-2 max-w-md text-sm text-white/35">
        {hasAssignments
          ? "Try changing your search or filter."
          : "Create your first assignment to start tracking your academic workload."}
      </p>

      {!hasAssignments && (
        <button
          onClick={onCreate}
          className="mt-5 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
        >
          <Plus size={16} />
          Create assignment
        </button>
      )}
    </div>
  );
}

function CreateAssignmentModal({
  courses,
  onClose,
  onCreated,
}: {
  courses: Course[];
  onClose: () => void;
  onCreated: (assignment: Assignment) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState(
    courses[0]?.id || ""
  );
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] =
    useState<"low" | "medium" | "high">("medium");
  const [maxPoints, setMaxPoints] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter an assignment title.");
      return;
    }

    if (!courseId) {
      setError("Please select a course.");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("assignments")
      .insert({
        user_id: user.id,
        course_id: courseId,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate
          ? new Date(dueDate).toISOString()
          : null,
        priority,
        status: "pending",
        progress: 0,
        points: null,
        max_points: maxPoints
          ? Number(maxPoints)
          : null,
      })
      .select(`
        *,
        courses (
          id,
          code,
          name
        )
      `)
      .single();

    if (insertError) {
      console.error(insertError);
      setError(insertError.message);
      setSaving(false);
      return;
    }

    onCreated(data as Assignment);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/[0.09] bg-[#100b1c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              New assignment
            </h2>

            <p className="mt-1 text-xs text-white/35">
              Add something you need to complete.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/30 hover:bg-white/[0.05] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-2 block text-xs font-medium text-white/50">
              Assignment title
            </label>

            <input
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Physics Lab Report"
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-white/50">
              Course
            </label>

            <select
              value={courseId}
              onChange={(event) =>
                setCourseId(event.target.value)
              }
              className="w-full rounded-xl border border-white/[0.08] bg-[#130d20] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50"
            >
              <option value="">Select course</option>

              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-white/50">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={3}
              placeholder="What do you need to do?"
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/50">
                Due date
              </label>

              <input
                type="datetime-local"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(event.target.value)
                }
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white/50">
                Max points
              </label>

              <input
                type="number"
                min="0"
                value={maxPoints}
                onChange={(event) =>
                  setMaxPoints(event.target.value)
                }
                placeholder="100"
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-500/50"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-white/50">
              Priority
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPriority(option)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition ${
                      priority === option
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                        : "border-white/[0.07] text-white/35 hover:bg-white/[0.04]"
                    }`}
                  >
                    {option}
                  </button>
                )
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {saving && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {saving ? "Creating..." : "Create assignment"}
          </button>
        </form>
      </div>
    </div>
  );
}