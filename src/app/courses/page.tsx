"use client";

import {
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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

const courseColors = [
  "violet",
  "blue",
  "emerald",
  "amber",
  "rose",
  "cyan",
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [professor, setProfessor] = useState("");
  const [room, setRoom] = useState("");
  const [schedule, setSchedule] = useState("");

  useEffect(() => {
  async function loadCourses() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

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
        color:
          courseColors[courses.length % courseColors.length],
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

    setCode("");
    setName("");
    setProfessor("");
    setRoom("");
    setSchedule("");

    setShowAddCourse(false);
    setSaving(false);
  }

  async function handleDeleteCourse(courseId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (deleteError) {
      console.error("Course deletion error:", deleteError);
      setError(deleteError.message);
      return;
    }

    setCourses((current) =>
      current.filter((course) => course.id !== courseId)
    );
  }

  return (
    <AppShell
      title="Courses"
      description="Manage your academic courses"
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Your Courses
            </h2>

            <p className="mt-1 text-sm text-white/40">
              {courses.length}{" "}
              {courses.length === 1 ? "course" : "courses"} this semester
            </p>
          </div>

          <button
            onClick={() => {
              setError("");
              setShowAddCourse(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
          >
            <Plus size={18} />
            Add Course
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && courses.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
              <BookOpen
                size={30}
                className="text-violet-400"
              />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-white">
              No courses yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
              Add your first course to start organizing your
              assignments, quizzes, calendar events, and study
              progress.
            </p>

            <button
              onClick={() => setShowAddCourse(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <Plus size={17} />
              Add your first course
            </button>
          </div>
        )}

        {/* Course grid */}
        {!loading && courses.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onDelete={() => handleDeleteCourse(course.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showAddCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#100b1b] shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Add Course
                </h2>

                <p className="mt-1 text-xs text-white/40">
                  Add a course to your StudySpace
                </p>
              </div>

              <button
                onClick={() => setShowAddCourse(false)}
                className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={handleAddCourse}
              className="space-y-5 p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <InputField
                  label="Course Code"
                  placeholder="e.g. PHY 1001"
                  value={code}
                  onChange={setCode}
                />

                <InputField
                  label="Course Name"
                  placeholder="e.g. Introductory Physics"
                  value={name}
                  onChange={setName}
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

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Adding Course..." : "Add Course"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-white/60">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-500/50 focus:bg-white/[0.06]"
      />
    </div>
  );
}

function CourseCard({
  course,
  onDelete,
}: {
  course: Course;
  onDelete: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition hover:border-violet-500/20 hover:bg-white/[0.035]">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
              <BookOpen
                size={21}
                className="text-violet-400"
              />
            </div>

            <Link
  href={`/courses/${course.id}`}
  className="group/course"
>
  <div>
    <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
      {course.code}
    </p>

    <h3 className="mt-1 text-lg font-semibold text-white transition group-hover/course:text-violet-200">
      {course.name}
    </h3>

    <p className="mt-1 text-xs text-white/25">
      Open course workspace →
    </p>
  </div>
</Link>
          </div>

          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
            title="Delete course"
          >
            <Trash2 size={17} />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {course.professor && (
            <InfoRow
              icon={<UserRound size={15} />}
              text={course.professor}
            />
          )}

          {course.room && (
            <InfoRow
              icon={<MapPin size={15} />}
              text={course.room}
            />
          )}

          {course.schedule && (
            <InfoRow
              icon={<CalendarDays size={15} />}
              text={course.schedule}
            />
          )}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-white/40">
              Course progress
            </span>

            <span className="text-xs font-semibold text-violet-300">
              {course.progress}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{
                width: `${Math.min(
                  Math.max(course.progress, 0),
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-xs text-white/30">
          <Clock3 size={14} />
          <span>Progress updates will appear here</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-white/50">
      <span className="text-white/25">{icon}</span>
      <span>{text}</span>
    </div>
  );
}