"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
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
type SortType = "due" | "priority" | "progress";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("due");
  const [showSort, setShowSort] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

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

  function getPriorityValue(priority: Assignment["priority"]) {
    if (priority === "high") return 3;
    if (priority === "medium") return 2;
    return 1;
  }

  const filteredAssignments = useMemo(() => {
    const query = search.toLowerCase().trim();

    const result = assignments.filter((assignment) => {
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

    return [...result].sort((a, b) => {
      if (sort === "priority") {
        return (
          getPriorityValue(b.priority) -
          getPriorityValue(a.priority)
        );
      }

      if (sort === "progress") {
        return b.progress - a.progress;
      }

      if (!a.due_date) return 1;
      if (!b.due_date) return -1;

      return (
        new Date(a.due_date).getTime() -
        new Date(b.due_date).getTime()
      );
    });
  }, [assignments, search, filter, sort]);

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

  const completionPercentage =
    total > 0 ? Math.round((completed / total) * 100) : 0;

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

  async function deleteAssignment() {
    if (!deleteTarget) return;

    setDeleting(true);

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting assignment:", error);
      setDeleting(false);
      return;
    }

    setAssignments((current) =>
      current.filter(
        (assignment) => assignment.id !== deleteTarget.id
      )
    );

    setDeleteTarget(null);
    setDeleting(false);
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
      description="Stay ahead of deadlines and keep your workload under control."
    >
      <div className="mx-auto max-w-[1500px] space-y-7 pb-10">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-purple-500/[0.06] blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
                <CheckCircle2 size={15} />
                Academic workload
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Assignments
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/45 sm:text-base">
                Everything you need to finish, organized around
                deadlines, progress, and priorities.
              </p>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 active:scale-[0.98]"
            >
              <Plus size={17} />
              New assignment
            </button>
          </div>
        </section>

        {/* Overview */}
        <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] sm:grid-cols-4">
          <OverviewStat
            label="Total"
            value={total}
            icon={<CalendarDays size={17} />}
          />

          <OverviewStat
            label="Due soon"
            value={upcoming}
            icon={<Clock3 size={17} />}
          />

          <OverviewStat
            label="Overdue"
            value={overdue}
            icon={<AlertCircle size={17} />}
            danger={overdue > 0}
          />

          <OverviewStat
            label="Completed"
            value={completed}
            icon={<Check size={17} />}
            success
          />
        </section>

        {/* Progress overview */}
        {total > 0 && (
          <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                Overall completion
              </p>
              <p className="mt-1 text-xs text-white/35">
                {completed} of {total} assignments completed
              </p>
            </div>

            <div className="flex w-full items-center gap-4 sm:max-w-md">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-500"
                  style={{
                    width: `${completionPercentage}%`,
                  }}
                />
              </div>

              <span className="w-12 text-right text-sm font-semibold text-white">
                {completionPercentage}%
              </span>
            </div>
          </section>
        )}

        {/* Controls */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search assignments, courses, or descriptions..."
                className="w-full rounded-xl border border-white/[0.07] bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-500/40 focus:bg-black/30"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
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

            <div className="relative">
              <button
                onClick={() => setShowSort((current) => !current)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-white sm:w-auto"
              >
                <Filter size={15} />
                Sort
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    showSort ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showSort && (
                <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-white/[0.09] bg-[#120d1e] p-1.5 shadow-2xl">
                  <SortOption
                    active={sort === "due"}
                    onClick={() => {
                      setSort("due");
                      setShowSort(false);
                    }}
                  >
                    Due date
                  </SortOption>

                  <SortOption
                    active={sort === "priority"}
                    onClick={() => {
                      setSort("priority");
                      setShowSort(false);
                    }}
                  >
                    Priority
                  </SortOption>

                  <SortOption
                    active={sort === "progress"}
                    onClick={() => {
                      setSort("progress");
                      setShowSort(false);
                    }}
                  >
                    Progress
                  </SortOption>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Results header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {filter === "all"
                ? "Your assignments"
                : filter === "upcoming"
                  ? "Upcoming assignments"
                  : filter === "overdue"
                    ? "Overdue assignments"
                    : "Completed assignments"}
            </p>

            <p className="mt-1 text-xs text-white/30">
              {filteredAssignments.length}{" "}
              {filteredAssignments.length === 1
                ? "assignment"
                : "assignments"}
              {search ? " matching your search" : ""}
            </p>
          </div>

          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-white/35 transition hover:text-white"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <div className="flex flex-col items-center gap-3">
              <Loader2
                size={25}
                className="animate-spin text-violet-400"
              />
              <span className="text-xs text-white/30">
                Loading assignments...
              </span>
            </div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <EmptyState
            hasAssignments={assignments.length > 0}
            onCreate={() => setShowCreate(true)}
            onClear={() => {
              setSearch("");
              setFilter("all");
            }}
          />
        ) : (
          <div className="space-y-2.5">
            {filteredAssignments.map((assignment) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                overdue={isOverdue(assignment)}
                onUpdate={updateAssignment}
                onDelete={() => setDeleteTarget(assignment)}
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

        {deleteTarget && (
          <DeleteAssignmentModal
            assignment={deleteTarget}
            deleting={deleting}
            onCancel={() => {
              if (!deleting) {
                setDeleteTarget(null);
              }
            }}
            onConfirm={deleteAssignment}
          />
        )}
      </div>
    </AppShell>
  );
}

function OverviewStat({
  label,
  value,
  icon,
  danger = false,
  success = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="border-b border-white/[0.07] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          danger
            ? "bg-red-500/10 text-red-400"
            : success
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-violet-500/10 text-violet-400"
        }`}
      >
        {icon}
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-white/30">{label}</p>
        </div>
      </div>
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
          : "text-white/35 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function SortOption({
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
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-violet-500/10 text-violet-300"
          : "text-white/50 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {children}
      {active && <Check size={14} />}
    </button>
  );
}

function AssignmentRow({
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
  onDelete: () => void;
}) {
  const dueDate = assignment.due_date
    ? new Date(assignment.due_date)
    : null;

  const completed = assignment.status === "completed";

  const priorityConfig = {
    low: {
      label: "Low",
      className: "bg-blue-500/10 text-blue-300",
      dot: "bg-blue-400",
    },
    medium: {
      label: "Medium",
      className: "bg-amber-500/10 text-amber-300",
      dot: "bg-amber-400",
    },
    high: {
      label: "High",
      className: "bg-red-500/10 text-red-300",
      dot: "bg-red-400",
    },
  };

  const priority = priorityConfig[assignment.priority];

  function formatDueDate(date: Date) {
    const now = new Date();

    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const startTomorrow = new Date(startToday);
    startTomorrow.setDate(startTomorrow.getDate() + 1);

    const assignmentDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (assignmentDay.getTime() === startToday.getTime()) {
      return "Today";
    }

    if (assignmentDay.getTime() === startTomorrow.getTime()) {
      return "Tomorrow";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== now.getFullYear()
          ? "numeric"
          : undefined,
    });
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition ${
        overdue
          ? "border-red-500/15 bg-red-500/[0.025]"
          : completed
            ? "border-white/[0.055] bg-white/[0.015]"
            : "border-white/[0.07] bg-white/[0.025] hover:border-violet-500/20 hover:bg-white/[0.035]"
      }`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-0.5 ${
          overdue
            ? "bg-red-500/70"
            : completed
              ? "bg-emerald-500/40"
              : "bg-violet-500/50"
        }`}
      />

      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
        {/* Completion */}
        <button
          onClick={() =>
            onUpdate(assignment.id, {
              status: completed ? "pending" : "completed",
              progress: completed ? 0 : 100,
            })
          }
          aria-label={
            completed
              ? "Mark assignment incomplete"
              : "Mark assignment complete"
          }
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
            completed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-white/[0.1] text-transparent hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-300"
          }`}
        >
          <Check size={17} />
        </button>

        {/* Main information */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {assignment.courses && (
              <Link
                href={`/courses/${assignment.course_id}`}
                className="group/course inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.13em] text-violet-400 transition hover:text-violet-300"
              >
                {assignment.courses.code}
                <ArrowUpRight
                  size={11}
                  className="opacity-0 transition group-hover/course:opacity-100"
                />
              </Link>
            )}

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${priority.className}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${priority.dot}`}
              />
              {priority.label}
            </span>

            {overdue && (
              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                Overdue
              </span>
            )}

            {assignment.status === "in_progress" &&
              !overdue &&
              !completed && (
                <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-300">
                  In progress
                </span>
              )}
          </div>

          <h3
            className={`mt-2 truncate text-[15px] font-semibold ${
              completed
                ? "text-white/35 line-through"
                : "text-white"
            }`}
          >
            {assignment.title}
          </h3>

          {assignment.description && (
            <p className="mt-1 line-clamp-1 max-w-2xl text-xs text-white/30">
              {assignment.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {dueDate && (
              <span
                className={`flex items-center gap-1.5 ${
                  overdue
                    ? "font-medium text-red-400"
                    : "text-white/35"
                }`}
              >
                <CalendarDays size={13} />
                {formatDueDate(dueDate)}
                <span className="text-white/20">
                  ·{" "}
                  {dueDate.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            )}

            {assignment.max_points !== null && (
              <span className="text-white/30">
                {assignment.points ?? 0}/{assignment.max_points} pts
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="w-full shrink-0 lg:w-48">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-white/30">
              Progress
            </span>

            <span className="text-xs font-semibold text-white/60">
              {assignment.progress}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all ${
                completed
                  ? "bg-emerald-500"
                  : "bg-violet-500"
              }`}
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
          onClick={onDelete}
          aria-label="Delete assignment"
          title="Delete assignment"
          className="self-end rounded-lg p-2 text-white/20 transition hover:bg-red-500/10 hover:text-red-400 lg:self-center"
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
  onClear,
}: {
  hasAssignments: boolean;
  onCreate: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/10 bg-violet-500/10 text-violet-400">
        {hasAssignments ? (
          <Search size={23} />
        ) : (
          <CheckCircle2 size={23} />
        )}
      </div>

      <h3 className="mt-5 text-lg font-semibold text-white">
        {hasAssignments
          ? "Nothing matches your filters"
          : "You're all set to start"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-white/35">
        {hasAssignments
          ? "Try another search or switch the assignment filter."
          : "Add your first assignment and keep your academic workload organized in one place."}
      </p>

      {hasAssignments ? (
        <button
          onClick={onClear}
          className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white"
        >
          Clear filters
        </button>
      ) : (
        <button
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/[0.09] bg-[#100b1c] shadow-2xl shadow-black/50">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#100b1c]/95 p-5 backdrop-blur-xl sm:p-6">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
              <Plus size={13} />
              New task
            </div>

            <h2 className="text-xl font-semibold text-white">
              Create assignment
            </h2>

            <p className="mt-1 text-xs text-white/35">
              Add the details you need to stay on top of it.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/30 transition hover:bg-white/[0.05] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          <div>
            <label className="mb-2 block text-xs font-medium text-white/55">
              Assignment title
            </label>

            <input
              autoFocus
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Physics Lab Report"
              className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-500/50 focus:bg-black/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-white/55">
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

            {courses.length === 0 && (
              <p className="mt-2 text-xs text-amber-400/80">
                You need an active course before creating an
                assignment.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-white/55">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={4}
              placeholder="What do you need to complete?"
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-500/50 focus:bg-black/30"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/55">
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
              <label className="mb-2 block text-xs font-medium text-white/55">
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
            <label className="mb-2 block text-xs font-medium text-white/55">
              Priority
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map(
                (option) => {
                  const active = priority === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPriority(option)}
                      className={`rounded-xl border px-3 py-3 text-xs font-semibold capitalize transition ${
                        active
                          ? option === "high"
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : option === "medium"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : "border-blue-500/30 bg-blue-500/10 text-blue-300"
                          : "border-white/[0.07] text-white/35 hover:bg-white/[0.04] hover:text-white/60"
                      }`}
                    >
                      {option}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/[0.08] px-4 py-3 text-sm font-medium text-white/45 transition hover:bg-white/[0.04] hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || courses.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {saving
                ? "Creating..."
                : "Create assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteAssignmentModal({
  assignment,
  deleting,
  onCancel,
  onConfirm,
}: {
  assignment: Assignment;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.09] bg-[#100b1c] p-6 shadow-2xl shadow-black/50">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
          <Trash2 size={19} />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-white">
          Delete assignment?
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/40">
          This will permanently remove{" "}
          <span className="font-medium text-white/70">
            “{assignment.title}”
          </span>
          . This action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-white/50 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {deleting && (
              <Loader2
                size={15}
                className="animate-spin"
              />
            )}
            {deleting ? "Deleting..." : "Delete assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}