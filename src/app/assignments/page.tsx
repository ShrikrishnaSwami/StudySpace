"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
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

type FilterType =
  | "all"
  | "upcoming"
  | "overdue"
  | "completed";

type SortType =
  | "due"
  | "priority"
  | "progress";

export default function AssignmentsPage() {
  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<FilterType>("all");

  const [sort, setSort] =
    useState<SortType>("due");

  const [showSort, setShowSort] =
    useState(false);

  const [showCreate, setShowCreate] =
    useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<Assignment | null>(null);

  const [deleting, setDeleting] =
    useState(false);

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

      const [
        assignmentResult,
        courseResult,
      ] = await Promise.all([
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
          .order("due_date", {
            ascending: true,
          }),

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

      setCourses(
        courseResult.data || []
      );

      setLoading(false);
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  function isOverdue(
    assignment: Assignment
  ) {
    if (!assignment.due_date) {
      return false;
    }

    if (
      assignment.status === "completed"
    ) {
      return false;
    }

    return (
      new Date(assignment.due_date) <
      new Date()
    );
  }

  function getPriorityValue(
    priority: Assignment["priority"]
  ) {
    if (priority === "high") return 3;
    if (priority === "medium") return 2;

    return 1;
  }

  const filteredAssignments =
    useMemo(() => {
      const query =
        search.toLowerCase().trim();

      const result = assignments.filter(
        (assignment) => {
          const matchesSearch =
            !query ||
            assignment.title
              .toLowerCase()
              .includes(query) ||
            assignment.description
              ?.toLowerCase()
              .includes(query) ||
            assignment.courses?.name
              ?.toLowerCase()
              .includes(query) ||
            assignment.courses?.code
              ?.toLowerCase()
              .includes(query);

          if (!matchesSearch) {
            return false;
          }

          if (filter === "completed") {
            return (
              assignment.status ===
              "completed"
            );
          }

          if (filter === "overdue") {
            return isOverdue(assignment);
          }

          if (filter === "upcoming") {
            return (
              assignment.status !==
                "completed" &&
              !isOverdue(assignment)
            );
          }

          return true;
        }
      );

      return [...result].sort(
        (a, b) => {
          if (sort === "priority") {
            return (
              getPriorityValue(b.priority) -
              getPriorityValue(a.priority)
            );
          }

          if (sort === "progress") {
            return (
              b.progress - a.progress
            );
          }

          if (!a.due_date) return 1;
          if (!b.due_date) return -1;

          return (
            new Date(
              a.due_date
            ).getTime() -
            new Date(
              b.due_date
            ).getTime()
          );
        }
      );
    },
    [
      assignments,
      search,
      filter,
      sort,
    ]
  );

  const total = assignments.length;

  const completed =
    assignments.filter(
      (assignment) =>
        assignment.status ===
        "completed"
    ).length;

  const overdue =
    assignments.filter(
      isOverdue
    ).length;

  const upcoming =
    assignments.filter(
      (assignment) =>
        assignment.status !==
          "completed" &&
        !isOverdue(assignment)
    ).length;

  const inProgress =
    assignments.filter(
      (assignment) =>
        assignment.status ===
        "in_progress"
    ).length;

  const completionPercentage =
    total > 0
      ? Math.round(
          (completed / total) * 100
        )
      : 0;

  const attentionAssignments =
    assignments
      .filter(
        (assignment) =>
          assignment.status !==
            "completed"
      )
      .sort((a, b) => {
        if (
          isOverdue(a) &&
          !isOverdue(b)
        ) {
          return -1;
        }

        if (
          !isOverdue(a) &&
          isOverdue(b)
        ) {
          return 1;
        }

        if (
          a.priority !==
          b.priority
        ) {
          return (
            getPriorityValue(
              b.priority
            ) -
            getPriorityValue(
              a.priority
            )
          );
        }

        if (
          !a.due_date
        )
          return 1;

        if (
          !b.due_date
        )
          return -1;

        return (
          new Date(
            a.due_date
          ).getTime() -
          new Date(
            b.due_date
          ).getTime()
        );
      })
      .slice(0, 3);

  async function updateAssignment(
    id: string,
    changes: Partial<Assignment>
  ) {
    const { error } =
      await supabase
        .from("assignments")
        .update({
          ...changes,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id);

    if (error) {
      console.error(
        "Error updating assignment:",
        error
      );

      return;
    }

    setAssignments(
      (current) =>
        current.map(
          (assignment) =>
            assignment.id === id
              ? {
                  ...assignment,
                  ...changes,
                }
              : assignment
        )
    );
  }

  async function deleteAssignment() {
    if (!deleteTarget) return;

    setDeleting(true);

    const { error } =
      await supabase
        .from("assignments")
        .delete()
        .eq(
          "id",
          deleteTarget.id
        );

    if (error) {
      console.error(
        "Error deleting assignment:",
        error
      );

      setDeleting(false);

      return;
    }

    setAssignments(
      (current) =>
        current.filter(
          (assignment) =>
            assignment.id !==
            deleteTarget.id
        )
    );

    setDeleteTarget(null);
    setDeleting(false);
  }

  function handleCreated(
    assignment: Assignment
  ) {
    setAssignments(
      (current) =>
        [...current, assignment].sort(
          (a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;

            return (
              new Date(
                a.due_date
              ).getTime() -
              new Date(
                b.due_date
              ).getTime()
            );
          }
        )
    );

    setShowCreate(false);
  }

  return (
    <AppShell
      title="Assignments"
      description="Keep track of what needs to get done."
    >
      <div className="mx-auto max-w-[1450px] space-y-7 pb-10">
        {/* Header */}
        <section className="border-b border-white/[0.08] pb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/25">
                Academic workload
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Assignments
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">
                See what is coming up, work through
                it, and keep your progress in one
                place.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCreate(true)
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <Plus size={16} />
              New assignment
            </button>
          </div>
        </section>

        {/* Overview */}
        <section className="grid grid-cols-2 border-y border-white/[0.08] sm:grid-cols-5">
          <OverviewStat
            label="Total"
            value={total}
          />

          <OverviewStat
            label="Due soon"
            value={upcoming}
          />

          <OverviewStat
            label="In progress"
            value={inProgress}
          />

          <OverviewStat
            label="Overdue"
            value={overdue}
            danger={overdue > 0}
          />

          <OverviewStat
            label="Completed"
            value={completed}
            success
          />
        </section>

        {/* What needs attention */}
        {!loading &&
          attentionAssignments.length >
            0 && (
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    What needs your attention
                  </p>

                  <p className="mt-1 text-xs text-white/25">
                    The assignments most worth
                    looking at next.
                  </p>
                </div>

                <Link
                  href="/calendar"
                  className="hidden items-center gap-1.5 text-xs font-medium text-white/30 transition hover:text-white sm:flex"
                >
                  Open calendar
                  <ArrowRight size={13} />
                </Link>
              </div>

              <div className="grid gap-2 lg:grid-cols-3">
                {attentionAssignments.map(
                  (assignment) => (
                    <AttentionCard
                      key={assignment.id}
                      assignment={assignment}
                      overdue={isOverdue(
                        assignment
                      )}
                    />
                  )
                )}
              </div>
            </section>
          )}

        {/* Controls */}
        <section className="border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search assignments or courses..."
                className="w-full rounded-lg border border-white/[0.07] bg-black/20 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-500/40"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <FilterButton
                active={
                  filter === "all"
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                All
              </FilterButton>

              <FilterButton
                active={
                  filter === "upcoming"
                }
                onClick={() =>
                  setFilter(
                    "upcoming"
                  )
                }
              >
                Upcoming
              </FilterButton>

              <FilterButton
                active={
                  filter === "overdue"
                }
                onClick={() =>
                  setFilter(
                    "overdue"
                  )
                }
              >
                Overdue
              </FilterButton>

              <FilterButton
                active={
                  filter === "completed"
                }
                onClick={() =>
                  setFilter(
                    "completed"
                  )
                }
              >
                Completed
              </FilterButton>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowSort(
                    (current) =>
                      !current
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-sm text-white/45 transition hover:bg-white/[0.05] hover:text-white sm:w-auto"
              >
                <Filter size={14} />
                Sort
                <ChevronDown
                  size={13}
                  className={
                    showSort
                      ? "rotate-180"
                      : ""
                  }
                />
              </button>

              {showSort && (
                <div className="absolute right-0 top-full z-20 mt-2 w-44 border border-white/[0.09] bg-[#17151c] p-1 shadow-2xl">
                  <SortOption
                    active={
                      sort === "due"
                    }
                    onClick={() => {
                      setSort("due");
                      setShowSort(false);
                    }}
                  >
                    Due date
                  </SortOption>

                  <SortOption
                    active={
                      sort === "priority"
                    }
                    onClick={() => {
                      setSort(
                        "priority"
                      );
                      setShowSort(false);
                    }}
                  >
                    Priority
                  </SortOption>

                  <SortOption
                    active={
                      sort === "progress"
                    }
                    onClick={() => {
                      setSort(
                        "progress"
                      );
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

        {/* Results */}
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

            <p className="mt-1 text-xs text-white/25">
              {filteredAssignments.length}{" "}
              {filteredAssignments.length ===
              1
                ? "assignment"
                : "assignments"}
              {search
                ? " matching your search"
                : ""}
            </p>
          </div>

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              className="text-xs text-white/30 transition hover:text-white"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center border border-white/[0.07] bg-white/[0.02]">
            <div className="flex flex-col items-center gap-3">
              <Loader2
                size={23}
                className="animate-spin text-violet-400"
              />

              <span className="text-xs text-white/25">
                Loading assignments...
              </span>
            </div>
          </div>
        ) : filteredAssignments.length ===
          0 ? (
          <EmptyState
            hasAssignments={
              assignments.length > 0
            }
            onCreate={() =>
              setShowCreate(true)
            }
            onClear={() => {
              setSearch("");
              setFilter("all");
            }}
          />
        ) : (
          <div className="space-y-2">
            {filteredAssignments.map(
              (assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  overdue={isOverdue(
                    assignment
                  )}
                  onUpdate={
                    updateAssignment
                  }
                  onDelete={() =>
                    setDeleteTarget(
                      assignment
                    )
                  }
                />
              )
            )}
          </div>
        )}

        {/* Create */}
        {showCreate && (
          <CreateAssignmentModal
            courses={courses}
            onClose={() =>
              setShowCreate(false)
            }
            onCreated={handleCreated}
          />
        )}

        {/* Delete */}
        {deleteTarget && (
          <DeleteAssignmentModal
            assignment={deleteTarget}
            deleting={deleting}
            onCancel={() => {
              if (!deleting) {
                setDeleteTarget(null);
              }
            }}
            onConfirm={
              deleteAssignment
            }
          />
        )}
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                   */
/* -------------------------------------------------------------------------- */

function OverviewStat({
  label,
  value,
  danger = false,
  success = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="border-b border-white/[0.07] px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-2xl font-bold tracking-tight text-white">
        {value}
      </p>

      <p
        className={[
          "mt-1 text-xs",
          danger
            ? "text-red-400"
            : success
              ? "text-emerald-400"
              : "text-white/25",
        ].join(" ")}
      >
        {label}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Attention cards                                                            */
/* -------------------------------------------------------------------------- */

function AttentionCard({
  assignment,
  overdue,
}: {
  assignment: Assignment;
  overdue: boolean;
}) {
  const dueDate = assignment.due_date
    ? new Date(assignment.due_date)
    : null;

  return (
    <Link
      href={`/assignments/${assignment.id}`}
      className={[
        "group block border p-4 transition",
        overdue
          ? "border-red-500/15 bg-red-500/[0.025] hover:border-red-500/30"
          : "border-white/[0.08] bg-white/[0.02] hover:border-violet-500/25 hover:bg-white/[0.035]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={[
            "text-[10px] font-semibold uppercase tracking-[0.12em]",
            overdue
              ? "text-red-400"
              : "text-white/25",
          ].join(" ")}
        >
          {overdue
            ? "Overdue"
            : assignment.priority ===
                "high"
              ? "High priority"
              : "Coming up"}
        </span>

        <ArrowUpRight
          size={14}
          className="text-white/20 transition group-hover:text-white/60"
        />
      </div>

      <h3 className="mt-3 truncate text-sm font-semibold text-white">
        {assignment.title}
      </h3>

      <div className="mt-1 text-xs text-white/30">
        {assignment.courses?.code ||
          "No course"}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={[
            "flex items-center gap-1.5 text-xs",
            overdue
              ? "text-red-400"
              : "text-white/30",
          ].join(" ")}
        >
          <CalendarDays size={12} />

          {dueDate
            ? formatDueDate(dueDate)
            : "No due date"}
        </span>

        <span className="text-xs font-medium text-white/35">
          {assignment.progress}%
        </span>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

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
      type="button"
      onClick={onClick}
      className={[
        "whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition",
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/30 hover:bg-white/[0.04] hover:text-white/70",
      ].join(" ")}
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
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition",
        active
          ? "bg-white/[0.06] text-white"
          : "text-white/40 hover:bg-white/[0.04] hover:text-white",
      ].join(" ")}
    >
      {children}

      {active && (
        <Check size={14} />
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Assignment row                                                             */
/* -------------------------------------------------------------------------- */

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
  const completed =
    assignment.status ===
    "completed";

  const dueDate =
    assignment.due_date
      ? new Date(
          assignment.due_date
        )
      : null;

  const priorityConfig = {
    low: {
      label: "Low",
      text: "text-blue-300",
      dot: "bg-blue-400",
    },

    medium: {
      label: "Medium",
      text: "text-amber-300",
      dot: "bg-amber-400",
    },

    high: {
      label: "High",
      text: "text-red-300",
      dot: "bg-red-400",
    },
  };

  const priority =
    priorityConfig[
      assignment.priority
    ];

  return (
    <div
      className={[
        "group border transition",
        overdue
          ? "border-red-500/15 bg-red-500/[0.02]"
          : completed
            ? "border-white/[0.055] bg-white/[0.012]"
            : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]",
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
        {/* Complete */}
        <button
          type="button"
          onClick={() =>
            onUpdate(
              assignment.id,
              {
                status: completed
                  ? "pending"
                  : "completed",

                progress:
                  completed
                    ? 0
                    : 100,
              }
            )
          }
          aria-label={
            completed
              ? "Mark assignment incomplete"
              : "Mark assignment complete"
          }
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition",
            completed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-white/[0.1] text-transparent hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-300",
          ].join(" ")}
        >
          <Check size={16} />
        </button>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {assignment.courses && (
              <Link
                href={`/courses/${assignment.course_id}`}
                onClick={(event) =>
                  event.stopPropagation()
                }
                className="text-[10px] font-bold uppercase tracking-[0.13em] text-violet-400 transition hover:text-violet-300"
              >
                {assignment.courses.code}
              </Link>
            )}

            <span
              className={[
                "inline-flex items-center gap-1.5 text-[10px] font-medium",
                priority.text,
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  priority.dot,
                ].join(" ")}
              />

              {priority.label}
            </span>

            {overdue && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
                Overdue
              </span>
            )}

            {assignment.status ===
              "in_progress" &&
              !overdue &&
              !completed && (
                <span className="text-[10px] font-medium text-violet-300">
                  In progress
                </span>
              )}
          </div>

          <Link
            href={`/assignments/${assignment.id}`}
            className="mt-2 block"
          >
            <h3
              className={[
                "truncate text-[15px] font-semibold transition",
                completed
                  ? "text-white/30 line-through"
                  : "text-white group-hover:text-violet-100",
              ].join(" ")}
            >
              {assignment.title}
            </h3>

            {assignment.description && (
              <p className="mt-1 line-clamp-1 max-w-2xl text-xs text-white/25">
                {assignment.description}
              </p>
            )}
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {dueDate && (
              <span
                className={[
                  "flex items-center gap-1.5",
                  overdue
                    ? "font-medium text-red-400"
                    : "text-white/30",
                ].join(" ")}
              >
                <CalendarDays size={12} />

                {formatDueDate(
                  dueDate
                )}

                <span className="text-white/15">
                  ·{" "}
                  {dueDate.toLocaleTimeString(
                    undefined,
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </span>
              </span>
            )}

            {assignment.max_points !==
              null && (
              <span className="text-white/25">
                {assignment.points ??
                  0}
                /
                {
                  assignment.max_points
                }{" "}
                pts
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="w-full shrink-0 lg:w-44">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium text-white/25">
              Progress
            </span>

            <span className="text-xs font-semibold text-white/50">
              {assignment.progress}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={[
                "h-full rounded-full transition-all",
                completed
                  ? "bg-emerald-500"
                  : "bg-violet-500",
              ].join(" ")}
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
              const progress =
                Number(
                  event.target.value
                );

              onUpdate(
                assignment.id,
                {
                  progress,

                  status:
                    progress === 100
                      ? "completed"
                      : progress > 0
                        ? "in_progress"
                        : "pending",
                }
              );
            }}
            className="mt-2 w-full accent-violet-500"
          />
        </div>

        {/* Workspace */}
        <Link
          href={`/assignments/${assignment.id}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2.5 text-xs font-medium text-white/40 transition hover:border-violet-500/25 hover:bg-violet-500/[0.05] hover:text-white lg:w-[125px]"
        >
          Work on it
          <ArrowRight size={13} />
        </Link>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete assignment"
          title="Delete assignment"
          className="self-end rounded-lg p-2 text-white/15 transition hover:bg-red-500/10 hover:text-red-400 lg:self-center"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

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
    <div className="flex min-h-[350px] flex-col items-center justify-center border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/30">
        {hasAssignments ? (
          <Search size={20} />
        ) : (
          <CheckCircle2 size={20} />
        )}
      </div>

      <h3 className="mt-5 text-lg font-semibold text-white">
        {hasAssignments
          ? "Nothing matches"
          : "No assignments yet"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-white/30">
        {hasAssignments
          ? "Try another search or switch your filter."
          : "Add your first assignment and StudySpace will keep it connected to your courses and calendar."}
      </p>

      {hasAssignments ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-white/50 transition hover:bg-white/[0.04] hover:text-white"
        >
          Clear filters
        </button>
      ) : (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          <Plus size={15} />
          Create assignment
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Create modal                                                               */
/* -------------------------------------------------------------------------- */

function CreateAssignmentModal({
  courses,
  onClose,
  onCreated,
}: {
  courses: Course[];
  onClose: () => void;
  onCreated: (
    assignment: Assignment
  ) => void;
}) {
  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [courseId, setCourseId] =
    useState(
      courses[0]?.id || ""
    );

  const [dueDate, setDueDate] =
    useState("");

  const [priority, setPriority] =
    useState<
      "low" | "medium" | "high"
    >("medium");

  const [maxPoints, setMaxPoints] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!title.trim()) {
      setError(
        "Please enter an assignment title."
      );

      return;
    }

    if (!courseId) {
      setError(
        "Please select a course."
      );

      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "You must be logged in."
      );

      setSaving(false);

      return;
    }

    const { data, error: insertError } =
      await supabase
        .from("assignments")
        .insert({
          user_id: user.id,
          course_id: courseId,
          title: title.trim(),
          description:
            description.trim() ||
            null,

          due_date: dueDate
            ? new Date(
                dueDate
              ).toISOString()
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
      console.error(
        insertError
      );

      setError(
        insertError.message
      );

      setSaving(false);

      return;
    }

    onCreated(
      data as Assignment
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-white/[0.09] bg-[#17151c] shadow-2xl shadow-black/50">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#17151c] p-5 sm:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">
              New assignment
            </p>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Add something to your workload
            </h2>

            <p className="mt-1 text-xs text-white/25">
              You can build a work plan after
              creating it.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/25 transition hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-5 sm:p-6"
        >
          <Field label="Assignment title">
            <input
              autoFocus
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="e.g. Physics Lab Report"
              className="form-input"
            />
          </Field>

          <Field label="Course">
            <select
              value={courseId}
              onChange={(event) =>
                setCourseId(
                  event.target.value
                )
              }
              className="form-input"
            >
              <option value="">
                Select course
              </option>

              {courses.map(
                (course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.code} —{" "}
                    {course.name}
                  </option>
                )
              )}
            </select>

            {courses.length === 0 && (
              <p className="mt-2 text-xs text-amber-400/80">
                Add an active course before
                creating an assignment.
              </p>
            )}
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={4}
              placeholder="What do you need to complete?"
              className="form-input resize-none"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due date">
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(
                    event.target.value
                  )
                }
                className="form-input"
              />
            </Field>

            <Field label="Max points">
              <input
                type="number"
                min="0"
                value={maxPoints}
                onChange={(event) =>
                  setMaxPoints(
                    event.target.value
                  )
                }
                placeholder="100"
                className="form-input"
              />
            </Field>
          </div>

          <Field label="Priority">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  "low",
                  "medium",
                  "high",
                ] as const
              ).map(
                (option) => {
                  const active =
                    priority ===
                    option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setPriority(
                          option
                        )
                      }
                      className={[
                        "border px-3 py-3 text-xs font-semibold capitalize transition",
                        active
                          ? option ===
                            "high"
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : option ===
                                "medium"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : "border-blue-500/30 bg-blue-500/10 text-blue-300"
                          : "border-white/[0.07] text-white/30 hover:bg-white/[0.04] hover:text-white/60",
                      ].join(" ")}
                    >
                      {option}
                    </button>
                  );
                }
              )}
            </div>
          </Field>

          {error && (
            <div className="border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-white/40 transition hover:bg-white/[0.04] hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                courses.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <Loader2
                  size={15}
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

/* -------------------------------------------------------------------------- */
/* Delete modal                                                               */
/* -------------------------------------------------------------------------- */

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
      <div className="w-full max-w-md border border-white/[0.09] bg-[#17151c] p-6 shadow-2xl shadow-black/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <Trash2 size={17} />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-white">
          Delete assignment?
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/35">
          This will permanently remove{" "}
          <span className="font-medium text-white/65">
            “{assignment.title}”
          </span>
          .
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-white/40 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {deleting && (
              <Loader2
                size={14}
                className="animate-spin"
              />
            )}

            {deleting
              ? "Deleting..."
              : "Delete assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-white/50">
        {label}
      </label>

      {children}
    </div>
  );
}

function formatDueDate(
  date: Date
) {
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const tomorrow = new Date(
    today
  );

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const assignmentDay =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  if (
    assignmentDay.getTime() ===
    today.getTime()
  ) {
    return "Today";
  }

  if (
    assignmentDay.getTime() ===
    tomorrow.getTime()
  ) {
    return "Tomorrow";
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
    }
  );
}