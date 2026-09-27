"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Flag,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Menu,
  Pencil,
  Play,
  Plus,
  Save,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Course = {
  id: string;
  user_id: string;
  code: string;
  name: string;
  professor: string | null;
  room: string | null;
  schedule: string | null;
  color: string | null;
  progress: number | null;
  description: string | null;
  target_grade: number | null;
  credits: number | null;
  semester: string | null;
  syllabus_url: string | null;
  archived: boolean;
};

type Note = {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
};

type Resource = {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  url: string;
  resource_type: string | null;
  description: string | null;
  created_at: string;
};

type Goal = {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  completed: boolean;
  due_date: string | null;
  created_at: string;
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
};

type Section =
  | "overview"
  | "topics"
  | "notes"
  | "materials"
  | "assignments"
  | "goals"
  | "study";

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();

  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [assignments, setAssignments] = useState<
    Assignment[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [section, setSection] =
    useState<Section>("overview");

  const [mobileMenu, setMobileMenu] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showResource, setShowResource] = useState(false);
  const [showGoal, setShowGoal] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchCourseData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const [
        courseResult,
        notesResult,
        resourcesResult,
        goalsResult,
        assignmentsResult,
      ] = await Promise.all([
        supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .eq("user_id", user.id)
          .single(),

        supabase
          .from("course_notes")
          .select("*")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .order("updated_at", {
            ascending: false,
          }),

        supabase
          .from("course_resources")
          .select("*")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("course_goals")
          .select("*")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("assignments")
          .select("*")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .order("due_date", {
            ascending: true,
          }),
      ]);

      if (cancelled) return;

      if (courseResult.error || !courseResult.data) {
        router.replace("/courses");
        return;
      }

      setCourse(courseResult.data as Course);
      setNotes((notesResult.data as Note[]) || []);
      setResources(
        (resourcesResult.data as Resource[]) || []
      );
      setGoals((goalsResult.data as Goal[]) || []);
      setAssignments(
        (assignmentsResult.data as Assignment[]) || []
      );

      setLoading(false);
    }

    fetchCourseData();

    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  useEffect(() => {
    if (!timerRunning) return;

    const interval = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [timerRunning]);

  async function finishStudySession() {
    if (seconds <= 0) {
      setTimerRunning(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && course) {
      await supabase.from("study_sessions").insert({
        course_id: course.id,
        user_id: user.id,
        started_at: new Date(
          Date.now() - seconds * 1000
        ).toISOString(),
        ended_at: new Date().toISOString(),
        duration_minutes: Math.max(
          1,
          Math.round(seconds / 60)
        ),
      });
    }

    setTimerRunning(false);
    setSeconds(0);
  }

  function formatTimer(value: number) {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;

    return [
      hours > 0
        ? String(hours).padStart(2, "0")
        : null,
      String(minutes).padStart(2, "0"),
      String(secs).padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":");
  }

  async function toggleAssignment(
    assignment: Assignment
  ) {
    const completed =
      assignment.status === "completed";

    const changes = {
      status: completed
        ? ("pending" as const)
        : ("completed" as const),
      progress: completed ? 0 : 100,
    };

    const { error } = await supabase
      .from("assignments")
      .update(changes)
      .eq("id", assignment.id);

    if (error) {
      console.error(error);
      return;
    }

    setAssignments((current) =>
      current.map((item) =>
        item.id === assignment.id
          ? { ...item, ...changes }
          : item
      )
    );
  }

  async function deleteNote(id: string) {
    const { error } = await supabase
      .from("course_notes")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotes((current) =>
      current.filter((note) => note.id !== id)
    );
  }

  async function deleteResource(id: string) {
    const { error } = await supabase
      .from("course_resources")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setResources((current) =>
      current.filter((resource) => resource.id !== id)
    );
  }

  async function toggleGoal(goal: Goal) {
    const { error } = await supabase
      .from("course_goals")
      .update({
        completed: !goal.completed,
      })
      .eq("id", goal.id);

    if (error) {
      alert(error.message);
      return;
    }

    setGoals((current) =>
      current.map((item) =>
        item.id === goal.id
          ? {
              ...item,
              completed: !item.completed,
            }
          : item
      )
    );
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase
      .from("course_goals")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setGoals((current) =>
      current.filter((goal) => goal.id !== id)
    );
  }

  if (loading) {
    return (
      <AppShell
        title="Course"
        description="Loading course workspace..."
      >
        <div className="flex min-h-[600px] items-center justify-center">
          <Loader2
            size={30}
            className="animate-spin text-violet-400"
          />
        </div>
      </AppShell>
    );
  }

  if (!course) return null;

  const progress = course.progress ?? 0;

  const completedAssignments = assignments.filter(
    (assignment) =>
      assignment.status === "completed"
  ).length;

  const activeGoals = goals.filter(
    (goal) => !goal.completed
  ).length;

  const upcomingAssignments = assignments
    .filter(
      (assignment) =>
        assignment.status !== "completed"
    )
    .slice(0, 4);

  const navItems: {
    id: Section;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard size={17} />,
    },
    {
      id: "topics",
      label: "Topics",
      icon: <BookOpen size={17} />,
    },
    {
      id: "notes",
      label: "Notes",
      icon: <FileText size={17} />,
    },
    {
      id: "materials",
      label: "Materials",
      icon: <FolderOpen size={17} />,
    },
    {
      id: "assignments",
      label: "Assignments",
      icon: <ListChecks size={17} />,
    },
    {
      id: "goals",
      label: "Goals",
      icon: <Target size={17} />,
    },
    {
      id: "study",
      label: "Study Mode",
      icon: <Brain size={17} />,
    },
  ];

  function selectSection(value: Section) {
    setSection(value);
    setMobileMenu(false);
  }

  return (
    <AppShell
      title={course.name}
      description={`${course.code} · ${course.professor || "Course workspace"}`}
    >
      <div className="min-h-[700px]">
        {/* Mobile course navigation */}
        <div className="mb-4 lg:hidden">
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm text-white"
          >
            <span className="flex items-center gap-2">
              <Menu size={17} />
              {navItems.find(
                (item) => item.id === section
              )?.label}
            </span>

            <span className="text-white/30">
              {mobileMenu ? "Close" : "Menu"}
            </span>
          </button>

          {mobileMenu && (
            <div className="mt-2 rounded-xl border border-white/[0.08] bg-[#100b1c] p-2">
              {navItems.map((item) => (
                <CourseNavButton
                  key={item.id}
                  active={section === item.id}
                  icon={item.icon}
                  onClick={() =>
                    selectSection(item.id)
                  }
                >
                  {item.label}
                </CourseNavButton>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          {/* Course sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
              <Link
                href="/courses"
                className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/35 transition hover:bg-white/[0.04] hover:text-white"
              >
                <ArrowLeft size={14} />
                All courses
              </Link>

              <div className="mb-5 border-b border-white/[0.07] pb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor:
                        course.color || "#7c3aed",
                    }}
                  >
                    <GraduationCap
                      size={19}
                      className="text-white"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase tracking-wider text-white/70">
                      {course.code}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-white/35">
                      {course.name}
                    </p>
                  </div>
                </div>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => (
                  <CourseNavButton
                    key={item.id}
                    active={section === item.id}
                    icon={item.icon}
                    onClick={() =>
                      selectSection(item.id)
                    }
                  >
                    {item.label}
                  </CourseNavButton>
                ))}
              </nav>

              <div className="mt-5 border-t border-white/[0.07] pt-4">
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <Pencil size={16} />
                  Edit course
                </button>
              </div>
            </div>
          </aside>

          {/* Main course workspace */}
          <main className="min-w-0">
            {/* Header */}
            <div className="mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 lg:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor:
                        course.color || "#7c3aed",
                    }}
                  >
                    <GraduationCap
                      size={25}
                      className="text-white"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-400">
                      {course.code}
                    </p>

                    <h1 className="mt-1 text-2xl font-bold text-white">
                      {course.name}
                    </h1>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/35">
                      {course.professor && (
                        <span>
                          {course.professor}
                        </span>
                      )}

                      {course.room && (
                        <span>{course.room}</span>
                      )}

                      {course.schedule && (
                        <span>
                          {course.schedule}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-white/30">
                      Course progress
                    </p>

                    <p className="mt-1 text-xl font-bold text-white">
                      {progress}%
                    </p>
                  </div>

                  <div className="h-12 w-12 rounded-full border-4 border-violet-500/20 border-t-violet-500">
                    <div className="flex h-full items-center justify-center text-[9px] font-bold text-violet-300">
                      {progress}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {section === "overview" && (
              <OverviewSection
                course={course}
                progress={progress}
                assignments={assignments}
                upcomingAssignments={upcomingAssignments}
                completedAssignments={completedAssignments}
                activeGoals={activeGoals}
                notes={notes}
                resources={resources}
                goals={goals}
                onAssignmentClick={() =>
                  setSection("assignments")
                }
                onStudyClick={() =>
                  setSection("study")
                }
              />
            )}

            {section === "topics" && (
              <TopicsSection />
            )}

            {section === "notes" && (
              <NotesSection
                notes={notes}
                onCreate={() => setShowNote(true)}
                onDelete={deleteNote}
              />
            )}

            {section === "materials" && (
              <MaterialsSection
                resources={resources}
                onCreate={() =>
                  setShowResource(true)
                }
                onDelete={deleteResource}
              />
            )}

            {section === "assignments" && (
              <CourseAssignmentsSection
                assignments={assignments}
                onToggle={toggleAssignment}
              />
            )}

            {section === "goals" && (
              <GoalsSection
                goals={goals}
                onCreate={() => setShowGoal(true)}
                onToggle={toggleGoal}
                onDelete={deleteGoal}
              />
            )}

            {section === "study" && (
              <StudySection
                timer={formatTimer(seconds)}
                running={timerRunning}
                onStart={() =>
                  setTimerRunning(true)
                }
                onPause={() =>
                  setTimerRunning(false)
                }
                onFinish={finishStudySession}
              />
            )}
          </main>
        </div>
      </div>

      {showEdit && (
        <EditCourseModal
          course={course}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setCourse(updated);
            setShowEdit(false);
          }}
        />
      )}

      {showNote && (
        <CreateNoteModal
          courseId={course.id}
          onClose={() => setShowNote(false)}
          onCreated={(note) => {
            setNotes((current) => [
              note,
              ...current,
            ]);
            setShowNote(false);
          }}
        />
      )}

      {showResource && (
        <CreateResourceModal
          courseId={course.id}
          onClose={() =>
            setShowResource(false)
          }
          onCreated={(resource) => {
            setResources((current) => [
              resource,
              ...current,
            ]);
            setShowResource(false);
          }}
        />
      )}

      {showGoal && (
        <CreateGoalModal
          courseId={course.id}
          onClose={() => setShowGoal(false)}
          onCreated={(goal) => {
            setGoals((current) => [
              goal,
              ...current,
            ]);
            setShowGoal(false);
          }}
        />
      )}
    </AppShell>
  );
}

function CourseNavButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
        active
          ? "bg-violet-500/10 text-violet-300"
          : "text-white/40 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function OverviewSection({
  course,
  progress,
  assignments,
  upcomingAssignments,
  completedAssignments,
  activeGoals,
  notes,
  resources,
  goals,
  onAssignmentClick,
  onStudyClick,
}: {
  course: Course;
  progress: number;
  assignments: Assignment[];
  upcomingAssignments: Assignment[];
  completedAssignments: number;
  activeGoals: number;
  notes: Note[];
  resources: Resource[];
  goals: Goal[];
  onAssignmentClick: () => void;
  onStudyClick: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Progress"
          value={`${progress}%`}
          icon={<Trophy size={17} />}
        />

        <Metric
          label="Target grade"
          value={
            course.target_grade !== null
              ? `${course.target_grade}%`
              : "—"
          }
          icon={<Target size={17} />}
        />

        <Metric
          label="Assignments"
          value={`${completedAssignments}/${assignments.length}`}
          icon={<ListChecks size={17} />}
        />

        <Metric
          label="Active goals"
          value={activeGoals}
          icon={<Flag size={17} />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* Continue learning */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                Continue learning
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                Keep building your momentum
              </h2>
            </div>

            <button
              onClick={onStudyClick}
              className="rounded-xl bg-violet-600 p-3 text-white hover:bg-violet-500"
            >
              <Play size={17} />
            </button>
          </div>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/40">
            Use Study Mode to focus on this course,
            record study time, and keep your learning
            sessions organized.
          </p>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-white/30">
                Overall progress
              </span>

              <span className="text-white/60">
                {progress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Course info */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2">
            <BookOpen
              size={17}
              className="text-violet-400"
            />

            <h2 className="font-semibold text-white">
              Course details
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            <InfoRow
              label="Professor"
              value={course.professor || "Not set"}
            />

            <InfoRow
              label="Credits"
              value={
                course.credits !== null
                  ? String(course.credits)
                  : "Not set"
              }
            />

            <InfoRow
              label="Semester"
              value={
                course.semester || "Not set"
              }
            />

            <InfoRow
              label="Schedule"
              value={
                course.schedule || "Not set"
              }
            />
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025]">
        <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
          <div>
            <h2 className="font-semibold text-white">
              Upcoming assignments
            </h2>

            <p className="mt-1 text-xs text-white/30">
              What needs your attention next.
            </p>
          </div>

          <button
            onClick={onAssignmentClick}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
          >
            View all
          </button>
        </div>

        {upcomingAssignments.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/30">
            No upcoming assignments.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {upcomingAssignments.map(
              (assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 p-5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <ListChecks size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {assignment.title}
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      {assignment.due_date
                        ? new Date(
                            assignment.due_date
                          ).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )
                        : "No deadline"}
                    </p>
                  </div>

                  <span className="text-xs text-white/30">
                    {assignment.progress}%
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Recent course activity */}
      <div className="grid gap-5 md:grid-cols-3">
        <MiniPanel
          icon={<FileText size={17} />}
          title="Notes"
          value={notes.length}
          subtitle="saved notes"
        />

        <MiniPanel
          icon={<FolderOpen size={17} />}
          title="Materials"
          value={resources.length}
          subtitle="resources"
        />

        <MiniPanel
          icon={<Target size={17} />}
          title="Goals"
          value={goals.length}
          subtitle="course goals"
        />
      </div>
    </div>
  );
}

function TopicsSection() {
  const topics = [
    {
      name: "Foundations",
      mastery: 92,
    },
    {
      name: "Core concepts",
      mastery: 78,
    },
    {
      name: "Problem solving",
      mastery: 64,
    },
    {
      name: "Advanced applications",
      mastery: 41,
    },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Topics"
        description="Track how confident you are with each part of the course."
      />

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025]">
        <div className="divide-y divide-white/[0.06]">
          {topics.map((topic) => (
            <div
              key={topic.name}
              className="p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {topic.name}
                  </h3>

                  <p className="mt-1 text-xs text-white/30">
                    Topic mastery
                  </p>
                </div>

                <span className="text-sm font-semibold text-violet-300">
                  {topic.mastery}%
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{
                    width: `${topic.mastery}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] p-6 text-center">
        <Brain
          size={25}
          className="mx-auto text-violet-400"
        />

        <h3 className="mt-3 font-semibold text-white">
          Topic intelligence is coming
        </h3>

        <p className="mx-auto mt-2 max-w-lg text-sm text-white/35">
          Later, StudySpace will calculate topic mastery
          from quizzes, assignments, notes, and AI study
          sessions.
        </p>
      </div>
    </div>
  );
}

function NotesSection({
  notes,
  onCreate,
  onDelete,
}: {
  notes: Note[];
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Notes"
        description="Your personal knowledge base for this course."
        action={
          <button
            onClick={onCreate}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            <Plus size={16} />
            New note
          </button>
        }
      />

      {notes.length === 0 ? (
        <EmptyPanel
          icon={<FileText size={25} />}
          title="No notes yet"
          description="Create notes as you work through this course."
          action="Create note"
          onClick={onCreate}
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">
                    {note.title}
                  </h3>

                  <p className="mt-1 text-xs text-white/25">
                    Updated{" "}
                    {new Date(
                      note.updated_at
                    ).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => onDelete(note.id)}
                  className="rounded-lg p-2 text-white/20 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {note.content && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/45">
                  {note.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialsSection({
  resources,
  onCreate,
  onDelete,
}: {
  resources: Resource[];
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Materials"
        description="Keep useful links, documents, videos, and resources together."
        action={
          <button
            onClick={onCreate}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            <Plus size={16} />
            Add material
          </button>
        }
      />

      {resources.length === 0 ? (
        <EmptyPanel
          icon={<FolderOpen size={25} />}
          title="No materials yet"
          description="Save important course resources here."
          action="Add material"
          onClick={onCreate}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <FolderOpen size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      {resource.title}
                    </h3>

                    {resource.resource_type && (
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-violet-400">
                        {resource.resource_type}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    onDelete(resource.id)
                  }
                  className="rounded-lg p-2 text-white/20 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {resource.description && (
                <p className="mt-4 text-sm text-white/35">
                  {resource.description}
                </p>
              )}

              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block truncate text-xs text-violet-400 hover:text-violet-300"
              >
                {resource.url}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseAssignmentsSection({
  assignments,
  onToggle,
}: {
  assignments: Assignment[];
  onToggle: (assignment: Assignment) => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Assignments"
        description="Assignments belonging to this course."
      />

      {assignments.length === 0 ? (
        <EmptyPanel
          icon={<ListChecks size={25} />}
          title="No assignments"
          description="Assignments you create from the main Assignments page will appear here."
          action="Open assignments"
          onClick={() => {
            router.push("/assignments");
          }}
        />
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    onToggle(assignment)
                  }
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    assignment.status ===
                    "completed"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 text-white/20 hover:border-violet-400/40"
                  }`}
                >
                  {assignment.status ===
                    "completed" && (
                    <Check size={17} />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <h3
                    className={`font-semibold ${
                      assignment.status ===
                      "completed"
                        ? "text-white/35 line-through"
                        : "text-white"
                    }`}
                  >
                    {assignment.title}
                  </h3>

                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/30">
                    <span>
                      {assignment.due_date
                        ? new Date(
                            assignment.due_date
                          ).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )
                        : "No deadline"}
                    </span>

                    <span>
                      {assignment.progress}%
                    </span>
                  </div>
                </div>

                <div className="hidden w-28 sm:block">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{
                        width: `${assignment.progress}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalsSection({
  goals,
  onCreate,
  onToggle,
  onDelete,
}: {
  goals: Goal[];
  onCreate: () => void;
  onToggle: (goal: Goal) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Goals"
        description="Set measurable targets for this course."
        action={
          <button
            onClick={onCreate}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            <Plus size={16} />
            New goal
          </button>
        }
      />

      {goals.length === 0 ? (
        <EmptyPanel
          icon={<Target size={25} />}
          title="No goals yet"
          description="Create a goal such as reaching a target grade or completing a chapter."
          action="Create goal"
          onClick={onCreate}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const target = goal.target_value ?? 0;
            const current = goal.current_value ?? 0;

            const percentage =
              target > 0
                ? Math.min(
                    100,
                    Math.round(
                      (current / target) * 100
                    )
                  )
                : goal.completed
                  ? 100
                  : 0;

            return (
              <div
                key={goal.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => onToggle(goal)}
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      goal.completed
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 text-white/20 hover:border-violet-400/40"
                    }`}
                  >
                    {goal.completed && (
                      <Check size={16} />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3
                          className={`font-semibold ${
                            goal.completed
                              ? "text-white/40 line-through"
                              : "text-white"
                          }`}
                        >
                          {goal.title}
                        </h3>

                        {goal.description && (
                          <p className="mt-1 text-sm text-white/35">
                            {goal.description}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          onDelete(goal.id)
                        }
                        className="rounded-lg p-2 text-white/20 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="text-white/30">
                          {current} / {target}
                        </span>

                        <span className="text-violet-300">
                          {percentage}%
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudySection({
  timer,
  running,
  onStart,
  onPause,
  onFinish,
}: {
  timer: string;
  running: boolean;
  onStart: () => void;
  onPause: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Study Mode"
        description="A focused workspace for studying this course."
      />

      <div className="rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.08] to-transparent p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
          <Brain size={30} />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
          Focus session
        </p>

        <div className="mt-3 text-5xl font-bold tracking-tight text-white">
          {timer}
        </div>

        <p className="mx-auto mt-4 max-w-md text-sm text-white/35">
          Start a study session and StudySpace will record
          the time you spend working on this course.
        </p>

        <div className="mt-7 flex justify-center gap-2">
          {!running ? (
            <button
              onClick={onStart}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500"
            >
              <Play size={16} />
              Start session
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
            >
              <Clock3 size={16} />
              Pause
            </button>
          )}

          <button
            onClick={onFinish}
            disabled={!running && timer === "00:00"}
            className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-semibold text-white/50 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Finish
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
        {icon}
      </div>

      <p className="mt-4 text-xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/30">
        {label}
      </p>
    </div>
  );
}

function MiniPanel({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="flex items-center gap-2 text-violet-400">
        {icon}
        <span className="text-sm font-medium text-white/60">
          {title}
        </span>
      </div>

      <p className="mt-5 text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/30">
        {subtitle}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-white/25">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-xs text-white/60">
        {value}
      </span>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">
          {title}
        </h2>

        <p className="mt-1 text-sm text-white/35">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] p-8 text-center">
      <div className="rounded-2xl bg-violet-500/10 p-4 text-violet-400">
        {icon}
      </div>

      <h3 className="mt-5 font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm text-white/35">
        {description}
      </p>

      <button
        onClick={onClick}
        className="mt-5 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
      >
        <Plus size={16} />
        {action}
      </button>
    </div>
  );
}

function EditCourseModal({
  course,
  onClose,
  onSaved,
}: {
  course: Course;
  onClose: () => void;
  onSaved: (course: Course) => void;
}) {
  const [name, setName] = useState(course.name);
  const [code, setCode] = useState(course.code);
  const [professor, setProfessor] = useState(
    course.professor || ""
  );
  const [room, setRoom] = useState(course.room || "");
  const [schedule, setSchedule] = useState(
    course.schedule || ""
  );
  const [progress, setProgress] = useState(
    String(course.progress ?? 0)
  );
  const [targetGrade, setTargetGrade] = useState(
    course.target_grade !== null
      ? String(course.target_grade)
      : ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const { data, error: updateError } =
      await supabase
        .from("courses")
        .update({
          name: name.trim(),
          code: code.trim(),
          professor: professor.trim() || null,
          room: room.trim() || null,
          schedule: schedule.trim() || null,
          progress: Number(progress),
          target_grade: targetGrade
            ? Number(targetGrade)
            : null,
        })
        .eq("id", course.id)
        .select("*")
        .single();

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    onSaved(data as Course);
  }

  return (
    <Modal title="Edit course" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Course name"
          value={name}
          onChange={setName}
        />

        <Input
          label="Course code"
          value={code}
          onChange={setCode}
        />

        <Input
          label="Professor"
          value={professor}
          onChange={setProfessor}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Room"
            value={room}
            onChange={setRoom}
          />

          <Input
            label="Schedule"
            value={schedule}
            onChange={setSchedule}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Progress %"
            type="number"
            min="0"
            max="100"
            value={progress}
            onChange={setProgress}
          />

          <Input
            label="Target grade %"
            type="number"
            min="0"
            max="100"
            value={targetGrade}
            onChange={setTargetGrade}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <button
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <Save size={16} />
          )}

          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}

function CreateNoteModal({
  courseId,
  onClose,
  onCreated,
}: {
  courseId: string;
  onClose: () => void;
  onCreated: (note: Note) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("course_notes")
      .insert({
        course_id: courseId,
        user_id: user.id,
        title: title.trim(),
        content: content.trim() || null,
      })
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    onCreated(data as Note);
  }

  return (
    <Modal title="New note" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Newton's Laws"
        />

        <Textarea
          label="Note"
          value={content}
          onChange={setContent}
          placeholder="Write your notes..."
        />

        <button
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving && (
            <Loader2
              size={16}
              className="animate-spin"
            />
          )}

          {saving ? "Saving..." : "Create note"}
        </button>
      </form>
    </Modal>
  );
}

function CreateResourceModal({
  courseId,
  onClose,
  onCreated,
}: {
  courseId: string;
  onClose: () => void;
  onCreated: (resource: Resource) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("link");
  const [description, setDescription] =
    useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim() || !url.trim()) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("course_resources")
      .insert({
        course_id: courseId,
        user_id: user.id,
        title: title.trim(),
        url: url.trim(),
        resource_type: type,
        description:
          description.trim() || null,
      })
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    onCreated(data as Resource);
  }

  return (
    <Modal
      title="Add material"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Lecture slides"
        />

        <Input
          label="URL"
          value={url}
          onChange={setUrl}
          placeholder="https://..."
        />

        <Input
          label="Type"
          value={type}
          onChange={setType}
          placeholder="link, video, document..."
        />

        <Textarea
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Optional description"
        />

        <button
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add material"}
        </button>
      </form>
    </Modal>
  );
}

function CreateGoalModal({
  courseId,
  onClose,
  onCreated,
}: {
  courseId: string;
  onClose: () => void;
  onCreated: (goal: Goal) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [target, setTarget] = useState("100");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("course_goals")
      .insert({
        course_id: courseId,
        user_id: user.id,
        title: title.trim(),
        description:
          description.trim() || null,
        target_value: Number(target) || 0,
        current_value: 0,
        completed: false,
        due_date: dueDate
          ? new Date(dueDate).toISOString()
          : null,
      })
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    onCreated(data as Goal);
  }

  return (
    <Modal title="New goal" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Goal"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Finish all Chapter 4 problems"
        />

        <Textarea
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="What does success look like?"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Target"
            type="number"
            value={target}
            onChange={setTarget}
          />

          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={setDueDate}
          />
        </div>

        <button
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create goal"}
        </button>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/[0.09] bg-[#100b1c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
          <h2 className="font-semibold text-white">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/30 hover:bg-white/[0.05] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-white/50">
        {label}
      </label>

      <input
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-500/50"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-white/50">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        rows={5}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-500/50"
      />
    </div>
  );
}