"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Flag,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

type Plan = {
  title: string;
  steps: string[];
  estimate: string;
};

const quickPrompts = [
  "Break this assignment into manageable steps.",
  "Explain what this assignment is asking me to do.",
  "Help me figure out where to start.",
  "What should I focus on first?",
];

export default function AssignmentWorkspacePage() {
  const params = useParams();
  const router = useRouter();

  const assignmentId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [assignment, setAssignment] =
    useState<Assignment | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  const [showDelete, setShowDelete] =
    useState(false);

  const [timerRunning, setTimerRunning] =
    useState(false);

  const [timerSeconds, setTimerSeconds] =
    useState(25 * 60);

  const [expandedDescription, setExpandedDescription] =
    useState(false);

  const loadAssignment = useCallback(async () => {
    if (!assignmentId) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("assignments")
      .select(`
        *,
        courses (
          id,
          code,
          name
        )
      `)
      .eq("id", assignmentId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      console.error(
        "Could not load assignment:",
        error
      );

      setAssignment(null);
      setLoading(false);
      return;
    }

    setAssignment(data as Assignment);
    setLoading(false);
  }, [assignmentId, router]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadAssignment();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [loadAssignment]);

  /* ---------------------------------------------------------------------- */
  /* Timer                                                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!timerRunning) return;

    const interval = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          return 25 * 60;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [timerRunning]);

  /* ---------------------------------------------------------------------- */
  /* Assignment updates                                                     */
  /* ---------------------------------------------------------------------- */

  async function updateAssignment(
    changes: Partial<Assignment>
  ) {
    if (!assignment) return;

    setSaving(true);

    const next = {
      ...changes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("assignments")
      .update(next)
      .eq("id", assignment.id)
      .eq("user_id", assignment.user_id);

    if (error) {
      console.error(
        "Could not update assignment:",
        error
      );

      setSaving(false);
      return;
    }

    setAssignment((current) =>
      current
        ? {
            ...current,
            ...changes,
            updated_at: next.updated_at,
          }
        : current
    );

    setSaving(false);
  }

  async function setProgress(progress: number) {
    const safeProgress = Math.max(
      0,
      Math.min(100, progress)
    );

    await updateAssignment({
      progress: safeProgress,
      status:
        safeProgress === 100
          ? "completed"
          : safeProgress > 0
            ? "in_progress"
            : "pending",
    });
  }

  async function toggleComplete() {
    if (!assignment) return;

    if (assignment.status === "completed") {
      await setProgress(
        Math.min(assignment.progress, 99)
      );
    } else {
      await setProgress(100);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* AI                                                                      */
  /* ---------------------------------------------------------------------- */

  async function askAI(prompt: string) {
    if (!assignment) return;

    setAiLoading(true);
    setAiResponse("");
    setAiPrompt(prompt);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const contextualPrompt = `
You are helping a student with one specific assignment.

Assignment:
${assignment.title}

Course:
${assignment.courses?.code || "Unknown course"} — ${
        assignment.courses?.name || "Unknown course"
      }

Description:
${assignment.description || "No description was provided."}

Due date:
${
  assignment.due_date
    ? new Date(
        assignment.due_date
      ).toLocaleString()
    : "No due date"
}

Priority:
${assignment.priority}

Current progress:
${assignment.progress}%

Student request:
${prompt}

Give practical academic help.
Do not pretend you know details that are not provided.
If the assignment description is incomplete, say what information is missing.
Help the student understand and complete the work rather than simply doing the entire assignment for them.
      `.trim();

      const response = await fetch(
        "/api/ai/tutor",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: contextualPrompt,
            courseId:
              assignment.course_id || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "The AI Tutor could not respond."
        );
      }

      setAiResponse(
        data.answer ||
          "The AI Tutor did not return a response."
      );
    } catch (error) {
      console.error(
        "Assignment AI error:",
        error
      );

      setAiResponse(
        error instanceof Error
          ? error.message
          : "Something went wrong while contacting the AI Tutor."
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function generatePlan() {
    if (!assignment) return;

    setPlanLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired."
        );
      }

      const prompt = `
Create a practical step-by-step work plan for this assignment.

Assignment:
${assignment.title}

Course:
${assignment.courses?.code || "Unknown"} — ${
        assignment.courses?.name || "Unknown"
      }

Description:
${assignment.description || "No description provided."}

Due:
${
  assignment.due_date
    ? new Date(
        assignment.due_date
      ).toLocaleString()
    : "No due date"
}

Current progress:
${assignment.progress}%

Return exactly this format:

TITLE: [short plan title]
ESTIMATE: [reasonable total effort estimate]
STEP 1: [action]
STEP 2: [action]
STEP 3: [action]
STEP 4: [action]
STEP 5: [action]

Only include as many steps as are actually useful.
Do not invent requirements that are not present.
      `.trim();

      const response = await fetch(
        "/api/ai/tutor",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: prompt,
            courseId:
              assignment.course_id || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not generate a plan."
        );
      }

      const text = data.answer || "";

      const titleMatch = text.match(
        /TITLE:\s*(.+)/i
      );

      const estimateMatch = text.match(
        /ESTIMATE:\s*(.+)/i
      );

      const steps = Array.from(
        text.matchAll(
          /STEP\s+\d+:\s*(.+)/gi
        )
      )
        .map((match) => (match as RegExpMatchArray)[1]?.trim())
        .filter((step): step is string => Boolean(step));

      setPlan({
        title:
          titleMatch?.[1]?.trim() ||
          "Suggested work plan",
        estimate:
          estimateMatch?.[1]?.trim() ||
          "Based on the assignment details",
        steps:
          steps.length > 0
            ? steps
            : text
                .split("\n")
                .map((line: string) =>
                  line
                    .replace(/^[-*•]\s*/, "")
                    .trim()
                )
                .filter(
                  (line: string) =>
                    line.length > 0
                )
                .slice(0, 6),
      });
    } catch (error) {
      console.error(
        "Plan generation error:",
        error
      );

      setPlan({
        title: "Plan unavailable",
        estimate: "Try again",
        steps: [
          "Review the assignment description.",
          "Identify what needs to be submitted.",
          "Break the work into smaller tasks.",
          "Complete and review each task.",
        ],
      });
    } finally {
      setPlanLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Delete                                                                  */
  /* ---------------------------------------------------------------------- */

  async function deleteAssignment() {
    if (!assignment) return;

    setSaving(true);

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignment.id)
      .eq("user_id", assignment.user_id);

    if (error) {
      console.error(
        "Could not delete assignment:",
        error
      );

      setSaving(false);
      return;
    }

    router.push("/assignments");
  }

  /* ---------------------------------------------------------------------- */
  /* Derived values                                                          */
  /* ---------------------------------------------------------------------- */

  const dueInfo = useMemo(() => {
    if (!assignment?.due_date) {
      return {
        label: "No due date",
        detail: "",
        overdue: false,
      };
    }

    const due = new Date(
      assignment.due_date
    );

    const now = new Date();

    const difference =
      due.getTime() - now.getTime();

    const hours = Math.round(
      Math.abs(difference) / 36e5
    );

    const days = Math.floor(hours / 24);

    if (
      assignment.status !== "completed" &&
      difference < 0
    ) {
      return {
        label: "Overdue",
        detail:
          days > 0
            ? `${days} day${days === 1 ? "" : "s"} late`
            : `${hours} hour${hours === 1 ? "" : "s"} late`,
        overdue: true,
      };
    }

    if (difference < 24 * 60 * 60 * 1000) {
      return {
        label: "Due today",
        detail: due.toLocaleTimeString(
          undefined,
          {
            hour: "numeric",
            minute: "2-digit",
          }
        ),
        overdue: false,
      };
    }

    if (
      difference <
      2 * 24 * 60 * 60 * 1000
    ) {
      return {
        label: "Due tomorrow",
        detail: due.toLocaleTimeString(
          undefined,
          {
            hour: "numeric",
            minute: "2-digit",
          }
        ),
        overdue: false,
      };
    }

    return {
      label: due.toLocaleDateString(
        undefined,
        {
          weekday: "long",
          month: "long",
          day: "numeric",
        }
      ),
      detail: due.toLocaleTimeString(
        undefined,
        {
          hour: "numeric",
          minute: "2-digit",
        }
      ),
      overdue: false,
    };
  }, [assignment]);

  const priorityLabel =
    assignment?.priority === "high"
      ? "High priority"
      : assignment?.priority === "medium"
        ? "Medium priority"
        : "Low priority";

  const timerDisplay = `${Math.floor(
    timerSeconds / 60
  )
    .toString()
    .padStart(2, "0")}:${(
    timerSeconds % 60
  )
    .toString()
    .padStart(2, "0")}`;

  if (loading) {
    return (
      <AppShell
        title="Assignment"
        description="Loading assignment..."
      >
        <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2
              size={24}
              className="animate-spin text-violet-400"
            />
            <p className="text-sm text-white/30">
              Loading assignment...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!assignment) {
    return (
      <AppShell
        title="Assignment"
        description="This assignment could not be found."
      >
        <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
            <Target
              size={22}
              className="text-white/30"
            />
          </div>

          <h2 className="mt-5 text-xl font-semibold text-white">
            Assignment not found
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-white/35">
            This assignment may have been deleted
            or you may no longer have access to it.
          </p>

          <Link
            href="/assignments"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <ArrowLeft size={15} />
            Back to assignments
          </Link>
        </div>
      </AppShell>
    );
  }

  const completed =
    assignment.status === "completed";

  return (
    <AppShell
      title="Assignment workspace"
      description={
        assignment.courses
          ? `${assignment.courses.code} · ${assignment.courses.name}`
          : "Work through your assignment"
      }
    >
      <div className="mx-auto max-w-[1280px] space-y-6 pb-12">
        {/* Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/assignments"
            className="inline-flex items-center gap-2 text-sm text-white/35 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            All assignments
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAssignment()}
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/30 transition hover:bg-white/[0.04] hover:text-white"
            >
              <RefreshCw size={15} />
            </button>

            <button
              type="button"
              onClick={() =>
                setShowDelete(true)
              }
              title="Delete assignment"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/25 transition hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Assignment header */}
        <section className="border border-white/[0.08] bg-white/[0.025]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                {assignment.courses && (
                  <Link
                    href={`/courses/${assignment.course_id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-violet-400 transition hover:text-violet-300"
                  >
                    {assignment.courses.code}
                    <ExternalLink size={11} />
                  </Link>
                )}

                <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {assignment.title}
                </h1>

                {assignment.description && (
                  <div className="mt-4 max-w-3xl">
                    <p
                      className={[
                        "text-sm leading-7 text-white/45",
                        expandedDescription
                          ? ""
                          : "line-clamp-3",
                      ].join(" ")}
                    >
                      {assignment.description}
                    </p>

                    {assignment.description.length >
                      220 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDescription(
                            (current) =>
                              !current
                          )
                        }
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-white/35 hover:text-white/70"
                      >
                        {expandedDescription
                          ? "Show less"
                          : "Read more"}
                        <ChevronDown
                          size={13}
                          className={
                            expandedDescription
                              ? "rotate-180"
                              : ""
                          }
                        />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  void toggleComplete()
                }
                disabled={saving}
                className={[
                  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
                  completed
                    ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "bg-violet-600 text-white hover:bg-violet-500",
                ].join(" ")}
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : completed ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Check size={16} />
                )}

                {completed
                  ? "Completed"
                  : "Mark complete"}
              </button>
            </div>

            {/* Metadata */}
            <div className="mt-8 grid border-t border-white/[0.07] pt-6 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem
                icon={<CalendarDays size={15} />}
                label="Due"
                value={dueInfo.label}
                detail={dueInfo.detail}
                danger={dueInfo.overdue}
              />

              <InfoItem
                icon={<Flag size={15} />}
                label="Priority"
                value={priorityLabel}
                detail={
                  assignment.status ===
                  "in_progress"
                    ? "In progress"
                    : assignment.status ===
                        "completed"
                      ? "Finished"
                      : "Not started"
                }
              />

              <InfoItem
                icon={<Target size={15} />}
                label="Progress"
                value={`${assignment.progress}%`}
                detail={
                  assignment.max_points !== null
                    ? `${assignment.points ?? 0}/${assignment.max_points} points`
                    : "No points recorded"
                }
              />

              <InfoItem
                icon={<Clock3 size={15} />}
                label="Status"
                value={
                  assignment.status ===
                  "completed"
                    ? "Completed"
                    : assignment.status ===
                        "in_progress"
                      ? "In progress"
                      : "Not started"
                }
                detail={
                  assignment.updated_at
                    ? `Updated ${new Date(
                        assignment.updated_at
                      ).toLocaleDateString()}`
                    : ""
                }
              />
            </div>
          </div>

          {/* Progress */}
          <div className="border-t border-white/[0.07] px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/35">
                Assignment progress
              </span>

              <span className="text-sm font-semibold text-white">
                {assignment.progress}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={[
                  "h-full rounded-full transition-all duration-500",
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
              onChange={(event) =>
                void setProgress(
                  Number(event.target.value)
                )
              }
              className="mt-3 w-full accent-violet-500"
            />
          </div>
        </section>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {/* Work plan */}
            <section className="border border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-5 sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Target
                      size={17}
                      className="text-violet-400"
                    />

                    <h2 className="text-base font-semibold text-white">
                      Work plan
                    </h2>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-white/30">
                    Turn the assignment into smaller
                    things you can actually finish.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void generatePlan()
                  }
                  disabled={planLoading}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  {planLoading ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Sparkles size={14} />
                  )}

                  {planLoading
                    ? "Planning..."
                    : plan
                      ? "Regenerate"
                      : "Build a plan"}
                </button>
              </div>

              {!plan ? (
                <div className="p-6">
                  <div className="border border-dashed border-white/[0.08] bg-white/[0.015] p-6 text-center">
                    <Target
                      size={20}
                      className="mx-auto text-white/20"
                    />

                    <p className="mt-3 text-sm font-medium text-white/55">
                      No plan yet
                    </p>

                    <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-white/25">
                      StudySpace can look at the
                      assignment details and turn them
                      into a practical starting plan.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-1 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {plan.title}
                      </h3>

                      <p className="mt-1 text-xs text-white/30">
                        Estimated effort:{" "}
                        {plan.estimate}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {plan.steps.map(
                      (step, index) => (
                        <div
                          key={`${step}-${index}`}
                          className="flex gap-4"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-xs font-semibold text-white/45">
                            {index + 1}
                          </div>

                          <div className="pt-1 text-sm leading-6 text-white/55">
                            {step}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* AI help */}
            <section className="border border-white/[0.08] bg-white/[0.02]">
              <div className="border-b border-white/[0.07] p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <MessageSquare
                    size={17}
                    className="text-violet-400"
                  />

                  <h2 className="text-base font-semibold text-white">
                    Need help?
                  </h2>
                </div>

                <p className="mt-1 text-xs leading-5 text-white/30">
                  Ask the tutor about this assignment
                  without losing its course context.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-2 sm:grid-cols-2">
                  {quickPrompts.map(
                    (prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() =>
                          void askAI(prompt)
                        }
                        disabled={aiLoading}
                        className="border border-white/[0.07] bg-white/[0.02] p-3 text-left text-xs leading-5 text-white/45 transition hover:border-violet-500/20 hover:bg-violet-500/[0.04] hover:text-white/70 disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    )
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={aiPrompt}
                    onChange={(event) =>
                      setAiPrompt(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        aiPrompt.trim()
                      ) {
                        event.preventDefault();

                        void askAI(
                          aiPrompt.trim()
                        );
                      }
                    }}
                    placeholder="Ask something about this assignment..."
                    className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-500/40"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (aiPrompt.trim()) {
                        void askAI(
                          aiPrompt.trim()
                        );
                      }
                    }}
                    disabled={
                      aiLoading ||
                      !aiPrompt.trim()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {aiLoading ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Sparkles size={15} />
                    )}

                    Ask
                  </button>
                </div>

                {aiResponse && (
                  <div className="mt-5 border-l-2 border-violet-500/50 bg-violet-500/[0.04] px-5 py-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-300">
                      <Sparkles size={13} />
                      StudySpace Tutor
                    </div>

                    <div className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                      {aiResponse}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Focus timer */}
            <section className="border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Timer
                      size={16}
                      className="text-white/45"
                    />

                    <h2 className="text-sm font-semibold text-white">
                      Focus timer
                    </h2>
                  </div>

                  <p className="mt-1 text-[11px] text-white/25">
                    A simple 25-minute work session.
                  </p>
                </div>
              </div>

              <div className="py-7 text-center">
                <div className="font-mono text-4xl font-semibold tracking-tight text-white">
                  {timerDisplay}
                </div>

                <p className="mt-2 text-[11px] text-white/25">
                  {timerRunning
                    ? "Stay with this assignment."
                    : "Ready when you are."}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setTimerRunning(
                      (current) => !current
                    )
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/[0.08] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/[0.12]"
                >
                  {timerRunning ? (
                    <>
                      <Clock3 size={14} />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Start
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(25 * 60);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] text-white/30 transition hover:bg-white/[0.04] hover:text-white"
                  title="Reset timer"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </section>

            {/* Assignment checklist */}
            <section className="border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={16}
                  className="text-white/45"
                />

                <h2 className="text-sm font-semibold text-white">
                  Keep moving
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                <ProgressAction
                  done={assignment.progress >= 25}
                  label="Get started"
                  onClick={() =>
                    void setProgress(
                      Math.max(
                        assignment.progress,
                        25
                      )
                    )
                  }
                />

                <ProgressAction
                  done={assignment.progress >= 50}
                  label="Halfway there"
                  onClick={() =>
                    void setProgress(
                      Math.max(
                        assignment.progress,
                        50
                      )
                    )
                  }
                />

                <ProgressAction
                  done={assignment.progress >= 75}
                  label="Final stretch"
                  onClick={() =>
                    void setProgress(
                      Math.max(
                        assignment.progress,
                        75
                      )
                    )
                  }
                />

                <ProgressAction
                  done={assignment.progress === 100}
                  label="Finish assignment"
                  onClick={() =>
                    void setProgress(100)
                  }
                />
              </div>
            </section>

            {/* Course */}
            {assignment.courses && (
              <section className="border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/20">
                  Course
                </p>

                <Link
                  href={`/courses/${assignment.course_id}`}
                  className="mt-3 block transition hover:opacity-80"
                >
                  <div className="text-lg font-semibold text-white">
                    {assignment.courses.code}
                  </div>

                  <div className="mt-1 text-sm text-white/35">
                    {assignment.courses.name}
                  </div>
                </Link>

                <Link
                  href={`/courses/${assignment.course_id}`}
                  className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-violet-400 transition hover:text-violet-300"
                >
                  Open course
                  <ExternalLink size={12} />
                </Link>
              </section>
            )}
          </aside>
        </div>
      </div>

      {/* Delete modal */}
      {showDelete && (
        <DeleteModal
          assignment={assignment}
          deleting={saving}
          onCancel={() =>
            !saving && setShowDelete(false)
          }
          onConfirm={() =>
            void deleteAssignment()
          }
        />
      )}
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function InfoItem({
  icon,
  label,
  value,
  detail,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className="border-b border-white/[0.07] py-4 first:pt-0 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:py-0 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
      <div className="flex items-center gap-2 text-white/25">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>

      <p
        className={[
          "mt-2 text-sm font-semibold",
          danger
            ? "text-red-400"
            : "text-white",
        ].join(" ")}
      >
        {value}
      </p>

      {detail && (
        <p className="mt-1 text-[11px] text-white/25">
          {detail}
        </p>
      )}
    </div>
  );
}

function ProgressAction({
  done,
  label,
  onClick,
}: {
  done: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 text-left"
    >
      <span
        className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
          done
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-white/[0.1] text-transparent hover:border-violet-400/40",
        ].join(" ")}
      >
        <Check size={12} />
      </span>

      <span
        className={[
          "text-xs transition",
          done
            ? "text-white/30 line-through"
            : "text-white/50 hover:text-white/80",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}

function DeleteModal({
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-white/[0.1] bg-[#17151c] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between border-b border-white/[0.08] p-5">
          <div>
            <h2 className="text-base font-semibold text-white">
              Delete assignment?
            </h2>

            <p className="mt-1 text-xs leading-5 text-white/30">
              This will permanently remove{" "}
              <span className="text-white/50">
                {assignment.title}
              </span>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="p-1.5 text-white/25 transition hover:text-white disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex justify-end gap-2 p-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-white/[0.08] px-4 py-2.5 text-xs font-medium text-white/50 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {deleting && (
              <Loader2
                size={14}
                className="animate-spin"
              />
            )}

            Delete
          </button>
        </div>
      </div>
    </div>
  );
}