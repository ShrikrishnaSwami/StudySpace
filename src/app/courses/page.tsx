"use client";

import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
  progress: number;
  created_at: string;
};

const courseThemes = [
  {
    name: "violet",
    accent: "bg-violet-500",
    soft: "bg-violet-500/10",
    text: "text-violet-300",
    border: "border-violet-500/20",
    glow: "bg-violet-500/10",
  },
  {
    name: "blue",
    accent: "bg-blue-500",
    soft: "bg-blue-500/10",
    text: "text-blue-300",
    border: "border-blue-500/20",
    glow: "bg-blue-500/10",
  },
  {
    name: "emerald",
    accent: "bg-emerald-500",
    soft: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/20",
    glow: "bg-emerald-500/10",
  },
  {
    name: "amber",
    accent: "bg-amber-500",
    soft: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/20",
    glow: "bg-amber-500/10",
  },
  {
    name: "rose",
    accent: "bg-rose-500",
    soft: "bg-rose-500/10",
    text: "text-rose-300",
    border: "border-rose-500/20",
    glow: "bg-rose-500/10",
  },
  {
    name: "cyan",
    accent: "bg-cyan-500",
    soft: "bg-cyan-500/10",
    text: "text-cyan-300",
    border: "border-cyan-500/20",
    glow: "bg-cyan-500/10",
  },
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [professor, setProfessor] = useState("");
  const [room, setRoom] = useState("");
  const [schedule, setSchedule] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setError("You must be logged in to view your courses.");
        setLoading(false);
        return;
      }

      const { data, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (coursesError) {
        console.error("Course loading error:", coursesError);
        setError(coursesError.message);
        setLoading(false);
        return;
      }

      setCourses(data || []);
      setLoading(false);
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code.trim() || !name.trim()) {
      setError("Course code and course name are required.");
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
      .from("courses")
      .insert({
        user_id: user.id,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        professor: professor.trim() || null,
        room: room.trim() || null,
        schedule: schedule.trim() || null,
        color: courseThemes[courses.length % courseThemes.length].name,
        progress: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Course creation error:", insertError);
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setCourses((current) => [...current, data]);

    resetForm();
    setShowAddCourse(false);
    setSaving(false);
  }

  async function handleDeleteCourse() {
    if (!deleteCourse) return;

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("courses")
      .delete()
      .eq("id", deleteCourse.id);

    if (deleteError) {
      console.error("Course deletion error:", deleteError);
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setCourses((current) =>
      current.filter((course) => course.id !== deleteCourse.id)
    );

    setDeleteCourse(null);
    setDeleting(false);
  }

  function resetForm() {
    setCode("");
    setName("");
    setProfessor("");
    setRoom("");
    setSchedule("");
  }

  const averageProgress = useMemo(() => {
    if (courses.length === 0) return 0;

    return Math.round(
      courses.reduce(
        (total, course) =>
          total + Math.min(Math.max(course.progress || 0, 0), 100),
        0
      ) / courses.length
    );
  }, [courses]);

  const activeCourses = courses.filter(
    (course) => (course.progress || 0) < 100
  ).length;

  return (
    <AppShell
      title="Courses"
      description="Your courses, organized in one place."
    >
      <div className="mx-auto max-w-[1450px] space-y-8">
        {/* Page header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-purple-500/[0.06] blur-3xl" />

          <div className="relative flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-3 py-1.5 text-xs font-medium text-violet-300">
                <BookOpen size={14} />
                Academic workspace
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Your courses
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/45 sm:text-base">
                Keep every class, schedule, professor, and progress update
                together so you always know what you&apos;re working toward.
              </p>
            </div>

            <button
              onClick={() => {
                setError("");
                setShowAddCourse(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500 active:scale-[0.98]"
            >
              <Plus size={17} />
              Add course
            </button>
          </div>
        </section>

        {/* Overview */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <OverviewStat
            label="Total courses"
            value={courses.length}
            detail={courses.length === 1 ? "class this semester" : "classes this semester"}
            icon={<BookOpen size={18} />}
          />

          <OverviewStat
            label="Active"
            value={activeCourses}
            detail="courses still in progress"
            icon={<Clock3 size={18} />}
          />

          <OverviewStat
            label="Average progress"
            value={`${averageProgress}%`}
            detail="across your courses"
            icon={<ChevronRight size={18} />}
          />
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3.5 text-sm text-red-300">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[285px] animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.025]"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && courses.length === 0 && (
          <section className="overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/[0.018]">
            <div className="relative flex min-h-[430px] flex-col items-center justify-center px-6 py-16 text-center">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.07] blur-3xl" />

              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/10">
                <BookOpen size={28} className="text-violet-300" />
              </div>

              <h2 className="relative mt-6 text-xl font-semibold text-white">
                Start building your semester
              </h2>

              <p className="relative mt-2 max-w-md text-sm leading-6 text-white/40">
                Add your first course and StudySpace can start connecting it
                with assignments, quizzes, calendar events, and study tools.
              </p>

              <button
                onClick={() => setShowAddCourse(true)}
                className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                <Plus size={17} />
                Add your first course
              </button>
            </div>
          </section>
        )}

        {/* Course grid */}
        {!loading && courses.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  All courses
                </h2>
                <p className="mt-1 text-sm text-white/35">
                  Select a course to open its workspace.
                </p>
              </div>

              <span className="hidden text-xs text-white/25 sm:block">
                {courses.length} {courses.length === 1 ? "course" : "courses"}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {courses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={index}
                  onDelete={() => setDeleteCourse(course)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Add course modal */}
      {showAddCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div
            className="absolute inset-0"
            onClick={() => !saving && setShowAddCourse(false)}
          />

          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#100b1b] shadow-2xl shadow-black/60">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#100b1b]/95 px-6 py-5 backdrop-blur-xl">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Add a course
                </h2>
                <p className="mt-1 text-xs text-white/35">
                  Create a new course workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={() => !saving && setShowAddCourse(false)}
                className="rounded-xl p-2 text-white/35 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-5 p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <InputField
                  label="Course code"
                  placeholder="e.g. PHY 1001"
                  value={code}
                  onChange={setCode}
                  required
                />

                <InputField
                  label="Course name"
                  placeholder="e.g. Introductory Physics"
                  value={name}
                  onChange={setName}
                  required
                />
              </div>

              <InputField
                label="Professor"
                placeholder="e.g. Dr. Smith"
                value={professor}
                onChange={setProfessor}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <InputField
                  label="Room"
                  placeholder="e.g. CB 302"
                  value={room}
                  onChange={setRoom}
                />

                <InputField
                  label="Schedule"
                  placeholder="e.g. Mon/Wed 10:00 AM"
                  value={schedule}
                  onChange={setSchedule}
                />
              </div>

              <div className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.05] p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                    <BookOpen size={15} className="text-violet-300" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white/80">
                      Your course workspace
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/35">
                      Once created, this course can be connected to
                      assignments, quizzes, and other StudySpace features.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => !saving && setShowAddCourse(false)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteCourse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div
            className="absolute inset-0"
            onClick={() => !deleting && setDeleteCourse(null)}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#100b1b] p-6 shadow-2xl shadow-black/60">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <Trash2 size={19} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-white">
              Delete this course?
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/40">
              You&apos;re about to delete{" "}
              <span className="font-medium text-white/70">
                {deleteCourse.code} — {deleteCourse.name}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteCourse(null)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
              >
                Keep course
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteCourse}
                className="rounded-xl bg-red-500/90 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function OverviewStat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-white/[0.11] hover:bg-white/[0.035]">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-white/45">
          {icon}
        </div>

        <span className="text-xs text-white/20">Overview</span>
      </div>

      <div className="mt-5">
        <p className="text-2xl font-semibold tracking-tight text-white">
          {value}
        </p>

        <p className="mt-1 text-sm font-medium text-white/65">{label}</p>

        <p className="mt-1 text-xs text-white/30">{detail}</p>
      </div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  required = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-white/60">
        {label}
        {required && <span className="ml-1 text-violet-400">*</span>}
      </label>

      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 hover:border-white/[0.12] focus:border-violet-500/50 focus:bg-white/[0.05]"
      />
    </div>
  );
}

function CourseCard({
  course,
  index,
  onDelete,
}: {
  course: Course;
  index: number;
  onDelete: () => void;
}) {
  const theme =
    courseThemes.find((item) => item.name === course.color) ||
    courseThemes[index % courseThemes.length];

  const progress = Math.min(Math.max(course.progress || 0, 0), 100);

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.035]">
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full ${theme.glow} blur-3xl opacity-70 transition duration-300 group-hover:opacity-100`}
      />

      <div className="relative p-5 sm:p-6">
        {/* Top */}
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/courses/${course.id}`}
            className="min-w-0 flex-1"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${theme.soft} ${theme.text}`}
              >
                <BookOpen size={21} />
              </div>

              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.text}`}
                >
                  {course.code}
                </p>

                <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-white transition group-hover:text-violet-100">
                  {course.name}
                </h3>

                <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-white/25 transition group-hover:text-white/40">
                  Open workspace
                  <ChevronRight size={13} />
                </div>
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${course.name}`}
            className="shrink-0 rounded-xl p-2 text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={17} />
          </button>
        </div>

        {/* Course information */}
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {course.professor && (
            <InfoItem
              icon={<UserRound size={15} />}
              label="Professor"
              value={course.professor}
            />
          )}

          {course.room && (
            <InfoItem
              icon={<MapPin size={15} />}
              label="Room"
              value={course.room}
            />
          )}

          {course.schedule && (
            <InfoItem
              icon={<CalendarDays size={15} />}
              label="Schedule"
              value={course.schedule}
            />
          )}

          {!course.professor && !course.room && !course.schedule && (
            <div className="sm:col-span-2 rounded-2xl border border-dashed border-white/[0.07] px-4 py-4 text-xs text-white/25">
              No class details added yet.
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mt-7 border-t border-white/[0.06] pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-white/35">
              Course progress
            </span>

            <span className={`text-xs font-semibold ${theme.text}`}>
              {progress}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full ${theme.accent} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Bottom action */}
        <Link
          href={`/courses/${course.id}`}
          className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs font-medium text-white/40 transition hover:border-white/[0.1] hover:bg-white/[0.045] hover:text-white/70"
        >
          <span>View course workspace</span>
          <ChevronRight size={15} />
        </Link>
      </div>
    </article>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.018] px-3.5 py-3">
      <div className="shrink-0 text-white/25">{icon}</div>

      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/20">
          {label}
        </p>

        <p className="mt-0.5 truncate text-xs text-white/55">{value}</p>
      </div>
    </div>
  );
}