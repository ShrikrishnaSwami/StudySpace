"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Lightbulb,
  Loader2,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  createHomework,
  deleteHomework,
  getHomework,
  getHomeworkDownloadUrl,
  uploadHomeworkFile,
  updateHomework,
  type Homework,
} from "@/lib/homework";

type Course = {
  id: string;
  code: string;
  name: string;
};

type Assignment = {
  id: string;
  course_id: string | null;
  title: string;
  due_date: string;
};

type AnalysisResult = {
  summary: string;
  explanation: string;
  solution: string;
  hints: string[];
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const SUPPORTED_TYPES = [
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatFileSize(size: number | null) {
  if (!size) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string | null) {
  if (type?.startsWith("image/")) {
    return "IMG";
  }

  if (type === "application/pdf") {
    return "PDF";
  }

  return "TXT";
}

function getStatusLabel(status: Homework["status"]) {
  switch (status) {
    case "analyzing":
      return "Analyzing";
    case "analyzed":
      return "Analyzed";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return "Uploaded";
  }
}

export default function HomeworkUploaderPage() {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedHomework, setSelectedHomework] =
    useState<Homework | null>(null);

  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        homeworkResult,
        coursesResult,
        assignmentsResult,
      ] = await Promise.all([
        getHomework(),

        supabase
          .from("courses")
          .select("id, code, name")
          .order("code", {
            ascending: true,
          }),

        supabase
          .from("assignments")
          .select(
            "id, course_id, title, due_date"
          )
          .order("due_date", {
            ascending: true,
          }),
      ]);

      if (coursesResult.error) {
        throw new Error(coursesResult.error.message);
      }

      if (assignmentsResult.error) {
        throw new Error(
          assignmentsResult.error.message
        );
      }

      setHomework(homeworkResult);
      setCourses(
        (coursesResult.data || []) as Course[]
      );
      setAssignments(
        (assignmentsResult.data || []) as Assignment[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load homework."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const filteredHomework = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return homework;
    }

    return homework.filter((item) => {
      const course = courses.find(
        (c) => c.id === item.course_id
      );

      return (
        item.title.toLowerCase().includes(query) ||
        item.description
          .toLowerCase()
          .includes(query) ||
        course?.code.toLowerCase().includes(query) ||
        course?.name.toLowerCase().includes(query)
      );
    });
  }, [homework, courses, search]);

  const selectedAssignments = useMemo(() => {
    if (!courseId) {
      return assignments;
    }

    return assignments.filter(
      (assignment) =>
        assignment.course_id === courseId
    );
  }, [assignments, courseId]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setCourseId("");
    setAssignmentId("");
    setSelectedFile(null);
    setAnalysis(null);
    setError("");
    setMessage("");
  }

  function closeCreate() {
    if (saving || analyzing) return;

    setShowCreate(false);
    resetForm();
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      setError(
        "Please upload a PDF, TXT, PNG, JPG, or WEBP file."
      );

      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Files must be smaller than 20 MB."
      );

      event.target.value = "";
      return;
    }

    setError("");
    setSelectedFile(file);
  }

  async function handleCreate(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter a homework title.");
      return;
    }

    if (!selectedFile) {
      setError("Please attach a homework file.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const record = await createHomework({
  title,
  description,
  course_id: courseId || null,
  assignment_id: assignmentId || null,
  file_name: selectedFile.name,
  file_type: selectedFile.type,
  file_size: selectedFile.size,
});

try {
  await uploadHomeworkFile(
    selectedFile,
    record.id
  );
} catch (uploadError) {
  // If the file upload fails, remove the
  // empty homework database record.
  await supabase
    .from("homework")
    .delete()
    .eq("id", record.id);

  throw uploadError;
}
      setHomework((current) => [
        record,
        ...current,
      ]);

      setSelectedHomework({
        ...record,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
      });

      setShowCreate(false);
      resetForm();

      setMessage(
        "Homework uploaded successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload homework."
      );
    } finally {
      setSaving(false);
    }
  }


async function analyzeHomework(
  item: Homework
) {
  setAnalyzing(true);
  setError("");

  try {
    if (!item.file_path) {
      throw new Error(
        "This homework record does not have a file attached. Please upload the file again."
      );
    }

    await updateHomework(item.id, {
      status: "analyzing",
    });

    setHomework((current) =>
      current.map((homeworkItem) =>
        homeworkItem.id === item.id
          ? {
              ...homeworkItem,
              status: "analyzing",
            }
          : homeworkItem
      )
    );

    const course = courses.find(
      (courseItem) =>
        courseItem.id === item.course_id
    );

    const {
      data: {
        session,
      },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const response = await fetch(
      "/api/ai/homework",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          homeworkId: item.id,
          title: item.title,
          description:
            item.description,
          courseName:
            course?.name || "",
          courseCode:
            course?.code || "",
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Homework analysis failed."
      );
    }

    const updated =
      await updateHomework(
        item.id,
        {
          status: "analyzed",
          ai_summary:
            data.summary || "",
          ai_solution:
            data.solution || "",
          ai_explanation:
            data.explanation || "",
          ai_hints:
            Array.isArray(data.hints)
              ? data.hints
              : [],
        }
      );

    setHomework((current) =>
      current.map((homeworkItem) =>
        homeworkItem.id === item.id
          ? updated
          : homeworkItem
      )
    );

    setSelectedHomework(updated);
  } catch (err) {
    console.error(
      "Homework analysis failed:",
      err
    );

    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to analyze homework.";

    setError(errorMessage);

    await updateHomework(
      item.id,
      {
        status: "uploaded",
      }
    ).catch(() => {});

    setHomework((current) =>
      current.map((homeworkItem) =>
        homeworkItem.id === item.id
          ? {
              ...homeworkItem,
              status: "uploaded",
            }
          : homeworkItem
      )
    );
  } finally {
    setAnalyzing(false);
  }
}
  function openHomework(item: Homework) {
    setSelectedHomework(item);

    if (
      item.ai_summary ||
      item.ai_explanation ||
      item.ai_solution
    ) {
      setAnalysis({
        summary: item.ai_summary,
        explanation: item.ai_explanation,
        solution: item.ai_solution,
        hints: item.ai_hints || [],
      });
    } else {
      setAnalysis(null);
    }

    setError("");
    setMessage("");
  }

  async function handleDelete(
    item: Homework
  ) {
    const confirmed = window.confirm(
      `Delete "${item.title}"? This will also delete the uploaded file.`
    );

    if (!confirmed) return;

    try {
      setError("");

      await deleteHomework(item.id);

      setHomework((current) =>
        current.filter(
          (homeworkItem) =>
            homeworkItem.id !== item.id
        )
      );

      if (
        selectedHomework?.id === item.id
      ) {
        setSelectedHomework(null);
        setAnalysis(null);
      }

      setMessage("Homework deleted.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete homework."
      );
    }
  }

  function getCourseName(
    courseId: string | null
  ) {
    if (!courseId) {
      return "No course";
    }

    const course = courses.find(
      (item) => item.id === courseId
    );

    if (!course) {
      return "Unknown course";
    }

    return `${course.code} · ${course.name}`;
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* HEADER */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-violet-300">
                <Sparkles size={16} />
                AI-powered learning
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Homework
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
                Upload homework, connect it to your
                course, and use AI to understand the
                problem instead of just getting an answer.
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
            >
              <Plus size={18} />
              Upload homework
            </button>
          </div>

          {/* ALERTS */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              <X
                size={18}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />
              <span>{message}</span>
            </div>
          )}

          {/* SEARCH */}
          <div className="mb-6">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search homework..."
              className="input max-w-xl"
            />
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2
                className="animate-spin text-violet-400"
                size={28}
              />
            </div>
          ) : filteredHomework.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                <FileText size={28} />
              </div>

              <h2 className="text-lg font-semibold text-white">
                No homework yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
                Upload your first homework assignment
                and StudySpace will keep it organized
                by course.
              </p>

              <button
                onClick={() => {
                  resetForm();
                  setShowCreate(true);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <Upload size={16} />
                Upload homework
              </button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredHomework.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    openHomework(item)
                  }
                  className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-violet-500/25 hover:bg-white/[0.045]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                      <FileText size={21} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate font-semibold text-white">
                            {item.title}
                          </h2>

                          <p className="mt-1 truncate text-xs text-white/40">
                            {getCourseName(
                              item.course_id
                            )}
                          </p>
                        </div>

                        <ChevronRight
                          size={18}
                          className="shrink-0 text-white/20 transition group-hover:translate-x-1 group-hover:text-violet-300"
                        />
                      </div>

                      {item.description && (
                        <p className="mt-3 line-clamp-2 text-sm leading-5 text-white/45">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/50">
                          {getFileIcon(
                            item.file_type
                          )}
                          {item.file_name
                            ? ` · ${item.file_name}`
                            : ""}
                        </span>

                        {item.file_size && (
                          <span className="text-[11px] text-white/30">
                            {formatFileSize(
                              item.file_size
                            )}
                          </span>
                        )}

                        <span
                          className={`ml-auto rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                            item.status ===
                            "analyzed"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : item.status ===
                                  "analyzing"
                                ? "bg-amber-500/10 text-amber-300"
                                : "bg-white/5 text-white/40"
                          }`}
                        >
                          {getStatusLabel(
                            item.status
                          )}
                        </span>
                      </div>

                      <div className="mt-3 text-[11px] text-white/25">
                        Added {formatDate(item.created_at)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#100b1b] shadow-2xl shadow-black/50">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#100b1b]/95 px-6 py-5 backdrop-blur">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Upload homework
                </h2>

                <p className="mt-1 text-xs text-white/40">
                  Add the problem so StudySpace can
                  analyze it later.
                </p>
              </div>

              <button
                onClick={closeCreate}
                className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="space-y-5 p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Homework title
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="e.g. Physics Problem Set 4"
                  className="input"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Optional notes about this homework..."
                  className="input resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Course
                  </label>

                  <select
                    value={courseId}
                    onChange={(event) => {
                      setCourseId(
                        event.target.value
                      );
                      setAssignmentId("");
                    }}
                    className="input"
                  >
                    <option value="">
                      No course
                    </option>

                    {courses.map((course) => (
                      <option
                        key={course.id}
                        value={course.id}
                      >
                        {course.code} ·{" "}
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Assignment
                  </label>

                  <select
                    value={assignmentId}
                    onChange={(event) =>
                      setAssignmentId(
                        event.target.value
                      )
                    }
                    className="input"
                    disabled={
                      selectedAssignments.length ===
                      0
                    }
                  >
                    <option value="">
                      No assignment
                    </option>

                    {selectedAssignments.map(
                      (assignment) => (
                        <option
                          key={assignment.id}
                          value={assignment.id}
                        >
                          {assignment.title}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <label className="block cursor-pointer">
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-8 text-center transition hover:border-violet-500/40 hover:bg-violet-500/[0.03]">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                    <Paperclip size={23} />
                  </div>

                  <div className="text-sm font-medium text-white">
                    {selectedFile
                      ? selectedFile.name
                      : "Choose a homework file"}
                  </div>

                  <div className="mt-2 text-xs text-white/35">
                    PDF, TXT, PNG, JPG, or WEBP ·
                    max 20 MB
                  </div>

                  {selectedFile && (
                    <div className="mt-3 text-xs text-violet-300">
                      {formatFileSize(
                        selectedFile.size
                      )}
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreate}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload homework
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOMEWORK DETAIL */}
      {selectedHomework && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#100b1b] shadow-2xl shadow-black/50">
            <div className="sticky top-0 z-20 flex items-start justify-between border-b border-white/10 bg-[#100b1b]/95 px-6 py-5 backdrop-blur">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-xs text-violet-300">
                  <GraduationCap size={14} />
                  {getCourseName(
                    selectedHomework.course_id
                  )}
                </div>

                <h2 className="truncate text-xl font-semibold text-white">
                  {selectedHomework.title}
                </h2>

                {selectedHomework.file_name && (
                  <p className="mt-1 text-xs text-white/35">
                    {selectedHomework.file_name}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedHomework(null);
                  setAnalysis(null);
                }}
                className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* FILE */}
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <FileText size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">
                      {selectedHomework.file_name ||
                        "Homework file"}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      {formatFileSize(
                        selectedHomework.file_size
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedHomework.file_path && (
                    <button
                      onClick={async () => {
                        try {
                          const url =
                            await getHomeworkDownloadUrl(
                              selectedHomework.file_path!
                            );

                          window.open(
                            url,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Could not open file."
                          );
                        }
                      }}
                      className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-white/15"
                    >
                      Open file
                    </button>
                  )}

                  <button
                    onClick={() =>
                      handleDelete(
                        selectedHomework
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-300 transition hover:bg-red-500/15"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>

              {/* AI ACTION */}
              {!analysis &&
                selectedHomework.status !==
                  "analyzing" && (
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                          <Brain size={21} />
                        </div>

                        <div>
                          <h3 className="font-semibold text-white">
                            Analyze with StudySpace AI
                          </h3>

                          <p className="mt-1 max-w-xl text-sm leading-5 text-white/40">
                            Get a summary, explanation,
                            solution approach, and hints
                            for this homework.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          analyzeHomework(
                            selectedHomework
                          )
                        }
                        disabled={analyzing}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                      >
                        {analyzing ? (
                          <>
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Analyze
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              {analyzing && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
                  <div className="flex items-center gap-3">
                    <Loader2
                      size={19}
                      className="animate-spin text-amber-300"
                    />

                    <div>
                      <p className="text-sm font-medium text-white">
                        AI is analyzing your homework
                      </p>

                      <p className="mt-1 text-xs text-white/35">
                        This may take a few seconds.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI RESULTS */}
              {analysis && (
                <div className="space-y-5">
                  <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <Sparkles
                        size={16}
                        className="text-violet-300"
                      />
                      Summary
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-7 text-white/60">
                      {analysis.summary}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <GraduationCap
                        size={16}
                        className="text-cyan-300"
                      />
                      Explanation
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-7 text-white/60">
                      {analysis.explanation}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.035] p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <CheckCircle2
                        size={16}
                        className="text-emerald-300"
                      />
                      Solution / approach
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-7 text-white/60">
                      {analysis.solution}
                    </p>
                  </section>

                  {analysis.hints.length > 0 && (
                    <section className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.035] p-5">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                        <Lightbulb
                          size={16}
                          className="text-amber-300"
                        />
                        Hints
                      </div>

                      <div className="space-y-3">
                        {analysis.hints.map(
                          (hint, index) => (
                            <div
                              key={`${hint}-${index}`}
                              className="flex gap-3"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-semibold text-amber-300">
                                {index + 1}
                              </span>

                              <p className="text-sm leading-6 text-white/55">
                                {hint}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </section>
                  )}

                  <button
                    onClick={() =>
                      analyzeHomework(
                        selectedHomework
                      )
                    }
                    disabled={analyzing}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
                  >
                    <Sparkles size={14} />
                    Analyze again
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-white/5 bg-black/10 p-4 text-xs leading-5 text-white/30">
                StudySpace AI is designed to help you
                understand the material. Always verify
                important answers against your course
                materials and instructor requirements.
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}