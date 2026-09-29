"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  ArrowUpRight,
  Brain,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  File,
  FileImage,
  FileText,
  Filter,
  GraduationCap,
  Lightbulb,
  Loader2,
  Plus,
  Search,
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
  updateHomework,
  uploadHomeworkFile,
  getHomeworkDownloadUrl,
  type Homework,
} from "@/lib/homework";

type Course = {
  id: string;
  code: string;
  name: string;
  professor?: string | null;
};

type Assignment = {
  id: string;
  title: string;
  course_id?: string | null;
  due_date?: string | null;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
];

function formatFileSize(size: number | null) {
  if (!size) return "Unknown size";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getFileIcon(fileType: string | null) {
  if (fileType?.startsWith("image/")) return FileImage;
  if (fileType === "application/pdf") return FileText;
  return File;
}

function getStatusLabel(status: Homework["status"]) {
  switch (status) {
    case "uploaded":
      return "Ready";
    case "analyzing":
      return "Analyzing";
    case "analyzed":
      return "Analyzed";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function getStatusClass(status: Homework["status"]) {
  switch (status) {
    case "analyzing":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "analyzed":
    case "completed":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "archived":
      return "border-slate-400/20 bg-slate-400/10 text-slate-300";
    default:
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";
  }
}

function getStatusDot(status: Homework["status"]) {
  switch (status) {
    case "analyzing":
      return "bg-amber-300";
    case "analyzed":
    case "completed":
      return "bg-emerald-300";
    case "archived":
      return "bg-slate-300";
    default:
      return "bg-violet-300";
  }
}

export default function HomeworkUploaderPage() {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ready" | "analyzed" | "analyzing"
  >("all");

  const [selectedHomework, setSelectedHomework] =
    useState<Homework | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<Homework | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadHomework = useCallback(async () => {
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
          .select("id, code, name, professor")
          .order("name"),

        supabase
          .from("assignments")
          .select("id, title, course_id, due_date")
          .order("due_date", {
            ascending: true,
          }),
      ]);

      if (coursesResult.error) {
        throw new Error(coursesResult.error.message);
      }

      if (assignmentsResult.error) {
        throw new Error(assignmentsResult.error.message);
      }

      setHomework(homeworkResult);
      setCourses((coursesResult.data || []) as Course[]);
      setAssignments((assignmentsResult.data || []) as Assignment[]);
    } catch (err) {
      console.error("Failed to load homework:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load homework.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = () => {
      void loadHomework();
    };

    queueMicrotask(load);

    return () => {};
  }, [loadHomework]);

  const filteredHomework = useMemo(() => {
    const query = search.trim().toLowerCase();

    return homework.filter((item) => {
      const course = courses.find(
        (courseItem) => courseItem.id === item.course_id,
      );

      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.file_name?.toLowerCase().includes(query) ||
        course?.name?.toLowerCase().includes(query) ||
        course?.code?.toLowerCase().includes(query);

      let matchesStatus = true;

      if (statusFilter === "ready") {
        matchesStatus = item.status === "uploaded";
      }

      if (statusFilter === "analyzed") {
        matchesStatus =
          item.status === "analyzed" ||
          item.status === "completed";
      }

      if (statusFilter === "analyzing") {
        matchesStatus = item.status === "analyzing";
      }

      return matchesSearch && matchesStatus;
    });
  }, [homework, courses, search, statusFilter]);

  const analyzedCount = homework.filter(
    (item) =>
      item.status === "analyzed" ||
      item.status === "completed",
  ).length;

  const readyCount = homework.filter(
    (item) => item.status === "uploaded",
  ).length;

  const analyzingCount = homework.filter(
    (item) => item.status === "analyzing",
  ).length;

  const totalFiles = homework.filter(
    (item) => item.file_path,
  ).length;

  const analysisRate =
    homework.length > 0
      ? Math.round((analyzedCount / homework.length) * 100)
      : 0;

  function resetUploadForm() {
    setTitle("");
    setDescription("");
    setCourseId("");
    setAssignmentId("");
    setSelectedFile(null);
  }

  function openUploadModal() {
    setError("");
    resetUploadForm();
    setShowUploadModal(true);
  }

  function closeUploadModal() {
    if (uploading) return;

    setShowUploadModal(false);
    setError("");
    resetUploadForm();
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (file.size > MAX_FILE_SIZE) {
      setError("Files must be smaller than 20 MB.");
      event.target.value = "";
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError(
        "Unsupported file type. Please upload a PDF, TXT, PNG, JPG, JPEG, or WEBP file.",
      );
      event.target.value = "";
      return;
    }

    setSelectedFile(file);

    if (!title.trim()) {
      const withoutExtension = file.name.replace(
        /\.[^/.]+$/,
        "",
      );

      setTitle(withoutExtension);
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select a homework file.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a homework title.");
      return;
    }

    setUploading(true);
    setError("");

    let record: Homework | null = null;

    try {
      record = await createHomework({
        title,
        description,
        course_id: courseId || null,
        assignment_id: assignmentId || null,
      });

      const uploadedHomework = await uploadHomeworkFile(
        selectedFile,
        record.id,
      );

      if (!uploadedHomework.file_path) {
        throw new Error(
          "The file uploaded, but the homework record was not linked to the file.",
        );
      }

      const refreshedHomework = await getHomework();

      setHomework(refreshedHomework);

      const freshRecord =
        refreshedHomework.find(
          (item) => item.id === uploadedHomework.id,
        ) || uploadedHomework;

      setSelectedHomework(freshRecord);

      resetUploadForm();
      setShowUploadModal(false);
    } catch (err) {
      console.error("Homework upload failed:", err);

      if (record?.id) {
        await supabase
          .from("homework")
          .delete()
          .eq("id", record.id);
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload homework.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function analyzeHomework(item: Homework) {
    setAnalyzing(true);
    setError("");

    try {
      if (!item.file_path) {
        const freshHomework = await getHomework();

        const freshItem = freshHomework.find(
          (homeworkItem) => homeworkItem.id === item.id,
        );

        if (!freshItem?.file_path) {
          throw new Error(
            "This homework record does not have a file attached. Please upload the file again.",
          );
        }

        item = freshItem;
        setHomework(freshHomework);
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
            : homeworkItem,
        ),
      );

      setSelectedHomework((current) =>
        current?.id === item.id
          ? {
              ...current,
              status: "analyzing",
            }
          : current,
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const course = courses.find(
        (courseItem) => courseItem.id === item.course_id,
      );

      const response = await fetch("/api/ai/homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          homeworkId: item.id,
          title: item.title,
          description: item.description,
          courseName: course?.name || "",
          courseCode: course?.code || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Homework analysis failed.",
        );
      }

      const updated = await updateHomework(item.id, {
        status: "analyzed",
        ai_summary: data.summary || "",
        ai_solution: data.solution || "",
        ai_explanation: data.explanation || "",
        ai_hints: Array.isArray(data.hints)
          ? data.hints
          : [],
      });

      setHomework((current) =>
        current.map((homeworkItem) =>
          homeworkItem.id === item.id
            ? updated
            : homeworkItem,
        ),
      );

      setSelectedHomework(updated);
    } catch (err) {
      console.error("Homework analysis failed:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Failed to analyze homework.";

      setError(message);

      await updateHomework(item.id, {
        status: "uploaded",
      }).catch(() => {});

      setHomework((current) =>
        current.map((homeworkItem) =>
          homeworkItem.id === item.id
            ? {
                ...homeworkItem,
                status: "uploaded",
              }
            : homeworkItem,
        ),
      );

      setSelectedHomework((current) =>
        current?.id === item.id
          ? {
              ...current,
              status: "uploaded",
            }
          : current,
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleOpenFile(item: Homework) {
    try {
      setError("");

      if (!item.file_path) {
        throw new Error(
          "This homework does not have an attached file.",
        );
      }

      const url = await getHomeworkDownloadUrl(
        item.file_path,
      );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (err) {
      console.error("Could not open homework:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not open homework file.",
      );
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const item = deleteTarget;

    try {
      setError("");

      await deleteHomework(item.id);

      setHomework((current) =>
        current.filter(
          (homeworkItem) => homeworkItem.id !== item.id,
        ),
      );

      if (selectedHomework?.id === item.id) {
        setSelectedHomework(null);
      }

      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete homework:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete homework.",
      );
    }
  }

  function getCourse(courseId: string | null) {
    if (!courseId) return null;

    return courses.find(
      (course) => course.id === courseId,
    );
  }

  function getAssignment(assignmentId: string | null) {
    if (!assignmentId) return null;

    return assignments.find(
      (assignment) => assignment.id === assignmentId,
    );
  }

  return (
    <AppShell>
      <div className="min-h-full">
        {/* HEADER */}
        <header className="border-b border-white/[0.06]">
          <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:py-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-violet-300/80">
                  <GraduationCap className="h-4 w-4" />
                  Academic workspace
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Homework
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40 sm:text-[15px]">
                  Keep your coursework together, then use AI
                  to understand the problems instead of just
                  getting an answer.
                </p>
              </div>

              <button
                type="button"
                onClick={openUploadModal}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-medium text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Upload homework
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 sm:py-8">
          {/* ERROR */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <div className="min-w-0 flex-1">
                {error}
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-300/60 transition hover:text-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* OVERVIEW */}
          <section className="mb-8">
            <div className="grid overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] sm:grid-cols-2 xl:grid-cols-4">
              <div className="border-b border-white/[0.06] p-5 sm:border-r xl:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/35">
                    Total files
                  </span>

                  <FileText className="h-4 w-4 text-white/25" />
                </div>

                <div className="mt-4 text-2xl font-semibold tracking-tight text-white">
                  {homework.length}
                </div>

                <p className="mt-1 text-xs text-white/35">
                  Uploaded to your workspace
                </p>
              </div>

              <div className="border-b border-white/[0.06] p-5 xl:border-r xl:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/35">
                    AI analyzed
                  </span>

                  <Sparkles className="h-4 w-4 text-violet-300/60" />
                </div>

                <div className="mt-4 flex items-end gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-white">
                    {analyzedCount}
                  </span>

                  <span className="pb-1 text-xs text-white/30">
                    / {homework.length}
                  </span>
                </div>

                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{
                      width: `${analysisRate}%`,
                    }}
                  />
                </div>
              </div>

              <div className="border-b border-white/[0.06] p-5 sm:border-r sm:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/35">
                    Ready to analyze
                  </span>

                  <Clock3 className="h-4 w-4 text-amber-300/60" />
                </div>

                <div className="mt-4 text-2xl font-semibold tracking-tight text-white">
                  {readyCount}
                </div>

                <p className="mt-1 text-xs text-white/35">
                  Waiting for your review
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/35">
                    Processing
                  </span>

                  <Brain className="h-4 w-4 text-cyan-300/60" />
                </div>

                <div className="mt-4 text-2xl font-semibold tracking-tight text-white">
                  {analyzingCount}
                </div>

                <p className="mt-1 text-xs text-white/35">
                  Currently being analyzed
                </p>
              </div>
            </div>
          </section>

          {/* TOOLBAR */}
          <section className="mb-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search homework, files, or courses..."
                  className="input h-11 pl-10"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">
                <div className="hidden px-2 sm:block">
                  <Filter className="h-4 w-4 text-white/25" />
                </div>

                {[
                  ["all", "All"],
                  ["ready", "Ready"],
                  ["analyzed", "Analyzed"],
                  ["analyzing", "Analyzing"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        value as
                          | "all"
                          | "ready"
                          | "analyzed"
                          | "analyzing",
                      )
                    }
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${
                      statusFilter === value
                        ? "bg-white/[0.09] text-white"
                        : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void loadHomework()}
                className="h-11 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 text-sm text-white/50 transition hover:bg-white/[0.06] hover:text-white"
              >
                Refresh
              </button>
            </div>
          </section>

          {/* CONTENT */}
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <div className="flex items-center gap-3 text-sm text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading your homework...
              </div>
            </div>
          ) : filteredHomework.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.018] px-6 py-24 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/[0.07]">
                {search || statusFilter !== "all" ? (
                  <Search className="h-6 w-6 text-violet-300" />
                ) : (
                  <Upload className="h-6 w-6 text-violet-300" />
                )}
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">
                {search || statusFilter !== "all"
                  ? "Nothing matches your filters"
                  : "Your homework workspace is empty"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
                {search || statusFilter !== "all"
                  ? "Try a different search or status filter."
                  : "Upload a homework file and StudySpace will organize it and give you an AI-powered explanation when you're ready."}
              </p>

              {!search && statusFilter === "all" && (
                <button
                  type="button"
                  onClick={openUploadModal}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
                >
                  <Upload className="h-4 w-4" />
                  Upload your first file
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHomework.map((item) => {
                const course = getCourse(item.course_id);
                const assignment = getAssignment(
                  item.assignment_id,
                );

                const Icon = getFileIcon(item.file_type);
                const isAnalyzing =
                  item.status === "analyzing";

                return (
                  <article
                    key={item.id}
                    className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] transition hover:border-violet-400/15 hover:bg-white/[0.035]"
                  >
                    <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
                      {/* FILE */}
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04]">
                          <Icon className="h-5 w-5 text-violet-300" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-sm font-semibold text-white">
                              {item.title}
                            </h2>

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusClass(
                                item.status,
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                                  item.status,
                                )}`}
                              />
                              {getStatusLabel(item.status)}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/30">
                            <span className="truncate">
                              {item.file_name || "No file attached"}
                            </span>

                            <span className="text-white/15">
                              •
                            </span>

                            <span>
                              {formatFileSize(item.file_size)}
                            </span>

                            <span className="text-white/15">
                              •
                            </span>

                            <span>
                              {formatDate(item.created_at)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {course && (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/45">
                                <BookOpen className="h-3 w-3" />
                                {course.code}
                              </span>
                            )}

                            {assignment && (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/45">
                                {assignment.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* DESCRIPTION */}
                      <div className="hidden max-w-sm flex-1 xl:block">
                        {item.description ? (
                          <p className="line-clamp-2 text-xs leading-5 text-white/35">
                            {item.description}
                          </p>
                        ) : (
                          <span className="text-xs text-white/20">
                            No description
                          </span>
                        )}
                      </div>

                      {/* ACTIONS */}
                      <div className="flex shrink-0 items-center gap-2 border-t border-white/[0.06] pt-4 lg:border-0 lg:pt-0">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedHomework(item)
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-medium text-white/55 transition hover:bg-white/[0.07] hover:text-white"
                        >
                          View
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={isAnalyzing}
                          onClick={() =>
                            void analyzeHomework(item)
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Analyzing
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              Analyze
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(item)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/20 transition hover:bg-red-500/10 hover:text-red-300"
                          title="Delete homework"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* FOOTER INFO */}
          {!loading && homework.length > 0 && (
            <div className="mt-5 flex flex-col gap-2 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {filteredHomework.length} of{" "}
                {homework.length} homework files
              </span>

              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300/50" />
                {totalFiles} files stored
              </span>
            </div>
          )}
        </main>

        {/* UPLOAD MODAL */}
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#100b19] shadow-2xl shadow-black/60">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#100b19]/95 px-6 py-5 backdrop-blur">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                      <Upload className="h-4 w-4 text-violet-300" />
                    </div>

                    <h2 className="text-lg font-semibold text-white">
                      Upload homework
                    </h2>
                  </div>

                  <p className="mt-2 text-xs text-white/30">
                    PDF, TXT, PNG, JPG, JPEG, or WEBP · max
                    20 MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeUploadModal}
                  disabled={uploading}
                  className="rounded-lg p-2 text-white/30 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleUpload}
                className="space-y-5 p-6"
              >
                <div>
                  <label className="mb-2 block text-xs font-medium text-white/55">
                    Title
                  </label>

                  <input
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    placeholder="e.g. Physics Problem Set 3"
                    className="input"
                    disabled={uploading}
                  />
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
                    placeholder="Optional notes about this homework..."
                    rows={3}
                    className="input resize-none"
                    disabled={uploading}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-white/55">
                      Course
                    </label>

                    <select
                      value={courseId}
                      onChange={(event) => {
                        setCourseId(event.target.value);
                        setAssignmentId("");
                      }}
                      className="input"
                      disabled={uploading}
                    >
                      <option value="">No course</option>

                      {courses.map((course) => (
                        <option
                          key={course.id}
                          value={course.id}
                        >
                          {course.code} · {course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-white/55">
                      Assignment
                    </label>

                    <select
                      value={assignmentId}
                      onChange={(event) =>
                        setAssignmentId(
                          event.target.value,
                        )
                      }
                      className="input"
                      disabled={uploading}
                    >
                      <option value="">
                        No assignment
                      </option>

                      {assignments
                        .filter(
                          (assignment) =>
                            !courseId ||
                            assignment.course_id ===
                              courseId,
                        )
                        .map((assignment) => (
                          <option
                            key={assignment.id}
                            value={assignment.id}
                          >
                            {assignment.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* FILE PICKER */}
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />

                  <div
                    className={`rounded-2xl border border-dashed p-8 text-center transition ${
                      selectedFile
                        ? "border-violet-400/30 bg-violet-500/[0.06]"
                        : "border-white/[0.1] bg-white/[0.018] hover:border-violet-400/25 hover:bg-violet-500/[0.03]"
                    }`}
                  >
                    {selectedFile ? (
                      <>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                          {(() => {
                            const Icon = getFileIcon(
                              selectedFile.type,
                            );

                            return (
                              <Icon className="h-6 w-6 text-violet-300" />
                            );
                          })()}
                        </div>

                        <div className="mt-4 break-all text-sm font-medium text-white">
                          {selectedFile.name}
                        </div>

                        <div className="mt-1 text-xs text-white/30">
                          {formatFileSize(
                            selectedFile.size,
                          )}
                        </div>

                        <div className="mt-3 text-xs text-violet-300">
                          Click to replace
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04]">
                          <Upload className="h-6 w-6 text-white/35" />
                        </div>

                        <div className="mt-4 text-sm font-medium text-white/75">
                          Choose a homework file
                        </div>

                        <div className="mt-1 text-xs text-white/30">
                          Drag and drop isn&apos;t required — just
                          choose a file
                        </div>
                      </>
                    )}
                  </div>
                </label>

                {error && (
                  <div className="flex gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-sm text-red-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5">
                  <button
                    type="button"
                    onClick={closeUploadModal}
                    disabled={uploading}
                    className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/50 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      uploading ||
                      !selectedFile ||
                      !title.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload homework
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DETAILS MODAL */}
        {selectedHomework && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#100b19] shadow-2xl shadow-black/60">
              <div className="flex shrink-0 items-start justify-between border-b border-white/[0.06] px-6 py-5">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${getStatusClass(
                        selectedHomework.status,
                      )}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                          selectedHomework.status,
                        )}`}
                      />
                      {getStatusLabel(
                        selectedHomework.status,
                      )}
                    </span>

                    {getCourse(
                      selectedHomework.course_id,
                    ) && (
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/40">
                        {
                          getCourse(
                            selectedHomework.course_id,
                          )?.code
                        }
                      </span>
                    )}
                  </div>

                  <h2 className="truncate text-xl font-semibold text-white sm:text-2xl">
                    {selectedHomework.title}
                  </h2>

                  <p className="mt-1 truncate text-xs text-white/30">
                    {selectedHomework.file_name ||
                      "No file attached"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedHomework(null)
                  }
                  className="ml-4 shrink-0 rounded-lg p-2 text-white/30 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
                  {/* LEFT */}
                  <aside className="space-y-3">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
                        File
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        {(() => {
                          const Icon = getFileIcon(
                            selectedHomework.file_type,
                          );

                          return (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                              <Icon className="h-5 w-5 text-violet-300" />
                            </div>
                          );
                        })()}

                        <div className="min-w-0">
                          <div className="truncate text-sm text-white">
                            {selectedHomework.file_name ||
                              "No file"}
                          </div>

                          <div className="mt-1 text-xs text-white/30">
                            {formatFileSize(
                              selectedHomework.file_size,
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void handleOpenFile(
                            selectedHomework,
                          )
                        }
                        disabled={
                          !selectedHomework.file_path
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/60 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Open file
                      </button>
                    </div>

                    {getCourse(
                      selectedHomework.course_id,
                    ) && (
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
                          Course
                        </div>

                        <div className="mt-3 text-sm font-semibold text-white">
                          {
                            getCourse(
                              selectedHomework.course_id,
                            )?.code
                          }
                        </div>

                        <div className="mt-1 text-xs leading-5 text-white/35">
                          {
                            getCourse(
                              selectedHomework.course_id,
                            )?.name
                          }
                        </div>

                        {getCourse(
                          selectedHomework.course_id,
                        )?.professor && (
                          <div className="mt-2 text-xs text-white/25">
                            {
                              getCourse(
                                selectedHomework.course_id,
                              )?.professor
                            }
                          </div>
                        )}
                      </div>
                    )}

                    {getAssignment(
                      selectedHomework.assignment_id,
                    ) && (
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
                          Assignment
                        </div>

                        <div className="mt-3 text-sm font-medium text-white">
                          {
                            getAssignment(
                              selectedHomework.assignment_id,
                            )?.title
                          }
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        void analyzeHomework(
                          selectedHomework,
                        )
                      }
                      disabled={
                        analyzing ||
                        !selectedHomework.file_path
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Analyze with AI
                        </>
                      )}
                    </button>
                  </aside>

                  {/* RIGHT */}
                  <section className="space-y-4">
                    {selectedHomework.description && (
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                        <div className="mb-3 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-white/30" />

                          <h3 className="text-sm font-semibold text-white">
                            Your notes
                          </h3>
                        </div>

                        <p className="whitespace-pre-wrap text-sm leading-7 text-white/50">
                          {selectedHomework.description}
                        </p>
                      </div>
                    )}

                    {selectedHomework.ai_summary ? (
                      <>
                        <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.045] p-5">
                          <div className="mb-4 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                              <Sparkles className="h-4 w-4 text-violet-300" />
                            </div>

                            <div>
                              <h3 className="text-sm font-semibold text-white">
                                AI Summary
                              </h3>

                              <p className="text-[11px] text-white/25">
                                Key ideas from your homework
                              </p>
                            </div>
                          </div>

                          <p className="whitespace-pre-wrap text-sm leading-7 text-white/60">
                            {selectedHomework.ai_summary}
                          </p>
                        </div>

                        {selectedHomework.ai_explanation && (
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                            <div className="mb-4 flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10">
                                <Brain className="h-4 w-4 text-cyan-300" />
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-white">
                                  Explanation
                                </h3>

                                <p className="text-[11px] text-white/25">
                                  How to understand the problem
                                </p>
                              </div>
                            </div>

                            <div className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                              {selectedHomework.ai_explanation}
                            </div>
                          </div>
                        )}

                        {selectedHomework.ai_solution && (
                          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.025] p-5">
                            <div className="mb-4 flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10">
                                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-white">
                                  Solution
                                </h3>

                                <p className="text-[11px] text-white/25">
                                  AI-generated solution approach
                                </p>
                              </div>
                            </div>

                            <div className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                              {selectedHomework.ai_solution}
                            </div>
                          </div>
                        )}

                        {selectedHomework.ai_hints &&
                          selectedHomework.ai_hints.length >
                            0 && (
                            <div className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.025] p-5">
                              <div className="mb-4 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10">
                                  <Lightbulb className="h-4 w-4 text-amber-300" />
                                </div>

                                <div>
                                  <h3 className="text-sm font-semibold text-white">
                                    Hints
                                  </h3>

                                  <p className="text-[11px] text-white/25">
                                    Helpful steps without giving
                                    everything away
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {selectedHomework.ai_hints.map(
                                  (hint, index) => (
                                    <div
                                      key={`${selectedHomework.id}-hint-${index}`}
                                      className="flex gap-3"
                                    >
                                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-[11px] font-semibold text-amber-300">
                                        {index + 1}
                                      </div>

                                      <p className="pt-0.5 text-sm leading-6 text-white/50">
                                        {hint}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/[0.06]">
                          <Sparkles className="h-7 w-7 text-violet-300" />
                        </div>

                        <h3 className="mt-5 text-base font-semibold text-white">
                          Ready for AI analysis
                        </h3>

                        <p className="mt-2 max-w-md text-sm leading-6 text-white/35">
                          StudySpace can analyze your uploaded
                          homework and break it down into a
                          summary, explanation, solution approach,
                          and useful hints.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            void analyzeHomework(
                              selectedHomework,
                            )
                          }
                          disabled={
                            analyzing ||
                            !selectedHomework.file_path
                          }
                          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {analyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Analyze homework
                            </>
                          )}
                        </button>

                        {!selectedHomework.file_path && (
                          <p className="mt-3 text-xs text-red-300/60">
                            No file is attached to this homework
                            record.
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#100b19] p-6 shadow-2xl shadow-black/60">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-300" />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">
                Delete this homework?
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/40">
                This will permanently remove{" "}
                <span className="text-white/65">
                  “{deleteTarget.title}”
                </span>{" "}
                and its associated homework record.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/55 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void confirmDelete()}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete homework
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}