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
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  Download,
  File,
  FileImage,
  FileText,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  Lightbulb,
  GraduationCap,
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
  if (fileType?.startsWith("image/")) {
    return FileImage;
  }

  if (fileType === "application/pdf") {
    return FileText;
  }

  return File;
}

function getStatusLabel(status: Homework["status"]) {
  switch (status) {
    case "uploaded":
      return "Uploaded";
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

export default function HomeworkUploaderPage() {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedHomework, setSelectedHomework] =
    useState<Homework | null>(null);

  const [showUploadModal, setShowUploadModal] =
    useState(false);

  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [courseId, setCourseId] =
    useState("");

  const [assignmentId, setAssignmentId] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

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
          .select(
            "id, code, name, professor"
          )
          .order("name"),

        supabase
          .from("assignments")
          .select(
            "id, title, course_id, due_date"
          )
          .order("due_date", {
            ascending: true,
          }),
      ]);

      setHomework(homeworkResult);

      if (coursesResult.error) {
        throw new Error(
          coursesResult.error.message
        );
      }

      if (assignmentsResult.error) {
        throw new Error(
          assignmentsResult.error.message
        );
      }

      setCourses(
        (coursesResult.data ||
          []) as Course[]
      );

      setAssignments(
        (assignmentsResult.data ||
          []) as Assignment[]
      );
    } catch (err) {
      console.error(
        "Failed to load homework:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load homework."
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

    return () => {
      // The queued task is harmless if the component unmounts before it runs.
    };
  }, [loadHomework]);

  const filteredHomework = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return homework;
    }

    return homework.filter((item) => {
      const course =
        courses.find(
          (courseItem) =>
            courseItem.id ===
            item.course_id
        );

      return (
        item.title
          .toLowerCase()
          .includes(query) ||
        item.description
          .toLowerCase()
          .includes(query) ||
        item.file_name
          ?.toLowerCase()
          .includes(query) ||
        course?.name
          ?.toLowerCase()
          .includes(query) ||
        course?.code
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [
    homework,
    courses,
    search,
  ]);

  const analyzedCount = homework.filter(
    (item) =>
      item.status === "analyzed" ||
      item.status === "completed"
  ).length;

  const uploadedCount = homework.filter(
    (item) =>
      item.status === "uploaded"
  ).length;

  const totalFiles = homework.filter(
    (item) => item.file_path
  ).length;

  function resetUploadForm() {
    setTitle("");
    setDescription("");
    setCourseId("");
    setAssignmentId("");
    setSelectedFile(null);
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Files must be smaller than 20 MB."
      );

      event.target.value = "";
      return;
    }

    if (
      !ACCEPTED_FILE_TYPES.includes(
        file.type
      )
    ) {
      setError(
        "Unsupported file type. Please upload a PDF, TXT, PNG, JPG, JPEG, or WEBP file."
      );

      event.target.value = "";
      return;
    }

    setSelectedFile(file);

    if (!title.trim()) {
      const withoutExtension =
        file.name.replace(
          /\.[^/.]+$/,
          ""
        );

      setTitle(withoutExtension);
    }
  }

  async function handleUpload(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!selectedFile) {
      setError(
        "Please select a homework file."
      );
      return;
    }

    if (!title.trim()) {
      setError(
        "Please enter a homework title."
      );
      return;
    }

    setUploading(true);
    setError("");

    let record: Homework | null =
      null;

    try {
      /*
       * ----------------------------------------
       * 1. Create database record
       * ----------------------------------------
       */

      record = await createHomework({
        title,
        description,
        course_id:
          courseId || null,
        assignment_id:
          assignmentId || null,
      });

      console.log(
        "Homework record created:",
        record
      );

      /*
       * ----------------------------------------
       * 2. Upload actual file
       * ----------------------------------------
       */

      const uploadedHomework =
        await uploadHomeworkFile(
          selectedFile,
          record.id
        );

      console.log(
        "Homework file attached:",
        uploadedHomework
      );

      /*
       * ----------------------------------------
       * 3. Verify file_path
       * ----------------------------------------
       */

      if (
        !uploadedHomework.file_path
      ) {
        throw new Error(
          "The file uploaded, but the homework record was not linked to the file."
        );
      }

      /*
       * ----------------------------------------
       * 4. Refresh from Supabase
       * ----------------------------------------
       */

      const refreshedHomework =
        await getHomework();

      setHomework(
        refreshedHomework
      );

      const freshRecord =
        refreshedHomework.find(
          (item) =>
            item.id ===
            uploadedHomework.id
        ) || uploadedHomework;

      /*
       * ----------------------------------------
       * 5. Show uploaded homework
       * ----------------------------------------
       */

      setSelectedHomework(
        freshRecord
      );

      resetUploadForm();
      setShowUploadModal(false);
    } catch (err) {
      console.error(
        "Homework upload failed:",
        err
      );

      /*
       * If the database record was created
       * but the upload failed, clean it up.
       */
      if (record?.id) {
        await supabase
          .from("homework")
          .delete()
          .eq("id", record.id);
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload homework."
      );
    } finally {
      setUploading(false);
    }
  }

  async function analyzeHomework(
    item: Homework
  ) {
    setAnalyzing(true);
    setError("");

    try {
      /*
       * ----------------------------------------
       * Make sure the UI has a file path
       * ----------------------------------------
       */

      if (!item.file_path) {
        /*
         * Before immediately failing, reload
         * the record from Supabase. This fixes
         * stale React state.
         */

        const freshHomework =
          await getHomework();

        const freshItem =
          freshHomework.find(
            (homeworkItem) =>
              homeworkItem.id ===
              item.id
          );

        if (!freshItem?.file_path) {
          throw new Error(
            "This homework record does not have a file attached. Please upload the file again."
          );
        }

        item = freshItem;

        setHomework(
          freshHomework
        );
      }

      /*
       * ----------------------------------------
       * Set analyzing state
       * ----------------------------------------
       */

      await updateHomework(
        item.id,
        {
          status: "analyzing",
        }
      );

      setHomework((current) =>
        current.map(
          (homeworkItem) =>
            homeworkItem.id ===
            item.id
              ? {
                  ...homeworkItem,
                  status:
                    "analyzing",
                }
              : homeworkItem
        )
      );

      /*
       * ----------------------------------------
       * Get authenticated session
       * ----------------------------------------
       */

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      /*
       * ----------------------------------------
       * Find course
       * ----------------------------------------
       */

      const course =
        courses.find(
          (courseItem) =>
            courseItem.id ===
            item.course_id
        );

      /*
       * ----------------------------------------
       * Send homework ID to server
       * ----------------------------------------
       */

      const response =
        await fetch(
          "/api/ai/homework",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              homeworkId:
                item.id,

              title:
                item.title,

              description:
                item.description,

              courseName:
                course?.name ||
                "",

              courseCode:
                course?.code ||
                "",
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

      /*
       * ----------------------------------------
       * Save analysis
       * ----------------------------------------
       */

      const updated =
        await updateHomework(
          item.id,
          {
            status:
              "analyzed",

            ai_summary:
              data.summary ||
              "",

            ai_solution:
              data.solution ||
              "",

            ai_explanation:
              data.explanation ||
              "",

            ai_hints:
              Array.isArray(
                data.hints
              )
                ? data.hints
                : [],
          }
        );

      setHomework((current) =>
        current.map(
          (homeworkItem) =>
            homeworkItem.id ===
            item.id
              ? updated
              : homeworkItem
        )
      );

      setSelectedHomework(
        updated
      );
    } catch (err) {
      console.error(
        "Homework analysis failed:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Failed to analyze homework.";

      setError(message);

      await updateHomework(
        item.id,
        {
          status: "uploaded",
        }
      ).catch(() => {});

      setHomework((current) =>
        current.map(
          (homeworkItem) =>
            homeworkItem.id ===
            item.id
              ? {
                  ...homeworkItem,
                  status:
                    "uploaded",
                }
              : homeworkItem
        )
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleOpenFile(
    item: Homework
  ) {
    try {
      setError("");

      if (!item.file_path) {
        throw new Error(
          "This homework does not have an attached file."
        );
      }

      const url =
        await getHomeworkDownloadUrl(
          item.file_path
        );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      console.error(
        "Could not open homework:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not open homework file."
      );
    }
  }

  async function handleDelete(
    item: Homework
  ) {
    const confirmed =
      window.confirm(
        `Delete "${item.title}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteHomework(
        item.id
      );

      setHomework((current) =>
        current.filter(
          (homeworkItem) =>
            homeworkItem.id !==
            item.id
        )
      );

      if (
        selectedHomework?.id ===
        item.id
      ) {
        setSelectedHomework(
          null
        );
      }
    } catch (err) {
      console.error(
        "Failed to delete homework:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete homework."
      );
    }
  }

  function getCourse(
    courseId: string | null
  ) {
    if (!courseId) {
      return null;
    }

    return courses.find(
      (course) =>
        course.id === courseId
    );
  }

  return (
    <AppShell>
      <div className="min-h-full">
        {/* ---------------------------------------- */}
        {/* HEADER */}
        {/* ---------------------------------------- */}

        <div className="border-b border-white/[0.06] bg-black/10">
          <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
                  <GraduationCap className="h-4 w-4" />
                  StudySpace
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Homework
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-white/45">
                  Upload assignments, keep them
                  organized, and let your AI tutor
                  explain what you need to know.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
              >
                <Plus className="h-4 w-4" />
                Upload homework
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
          {/* ---------------------------------------- */}
          {/* ERROR */}
          {/* ---------------------------------------- */}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <div className="flex-1">
                {error}
              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="text-red-300/60 transition hover:text-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ---------------------------------------- */}
          {/* STATS */}
          {/* ---------------------------------------- */}

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-violet-500/10 p-2.5">
                  <FileText className="h-5 w-5 text-violet-300" />
                </div>

                <span className="text-xs text-white/30">
                  Total
                </span>
              </div>

              <div className="text-2xl font-semibold text-white">
                {homework.length}
              </div>

              <div className="mt-1 text-xs text-white/40">
                Homework files
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-emerald-500/10 p-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                </div>

                <span className="text-xs text-white/30">
                  AI
                </span>
              </div>

              <div className="text-2xl font-semibold text-white">
                {analyzedCount}
              </div>

              <div className="mt-1 text-xs text-white/40">
                Files analyzed
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-amber-500/10 p-2.5">
                  <Clock3 className="h-5 w-5 text-amber-300" />
                </div>

                <span className="text-xs text-white/30">
                  Pending
                </span>
              </div>

              <div className="text-2xl font-semibold text-white">
                {uploadedCount}
              </div>

              <div className="mt-1 text-xs text-white/40">
                Waiting for analysis
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-cyan-500/10 p-2.5">
                  <Upload className="h-5 w-5 text-cyan-300" />
                </div>

                <span className="text-xs text-white/30">
                  Storage
                </span>
              </div>

              <div className="text-2xl font-semibold text-white">
                {totalFiles}
              </div>

              <div className="mt-1 text-xs text-white/40">
                Files attached
              </div>
            </div>
          </div>

          {/* ---------------------------------------- */}
          {/* SEARCH */}
          {/* ---------------------------------------- */}

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search homework..."
                className="input pl-10"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                loadHomework()
              }
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
            >
              Refresh
            </button>
          </div>

          {/* ---------------------------------------- */}
          {/* LOADING */}
          {/* ---------------------------------------- */}

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading homework...
              </div>
            </div>
          ) : filteredHomework.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                <BookOpen className="h-7 w-7 text-violet-300" />
              </div>

              <h2 className="text-lg font-medium text-white">
                {search
                  ? "No homework found"
                  : "No homework yet"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
                {search
                  ? "Try a different search."
                  : "Upload your first homework file and StudySpace will keep everything organized for you."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={() =>
                    setShowUploadModal(
                      true
                    )
                  }
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
                >
                  <Upload className="h-4 w-4" />
                  Upload homework
                </button>
              )}
            </div>
          ) : (
            /* ---------------------------------------- */
            /* HOMEWORK GRID */
            /* ---------------------------------------- */

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredHomework.map(
                (item) => {
                  const course =
                    getCourse(
                      item.course_id
                    );

                  const Icon =
                    getFileIcon(
                      item.file_type
                    );

                  const isAnalyzing =
                    item.status ===
                    "analyzing";

                  return (
                    <div
                      key={item.id}
                      className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] transition hover:border-violet-400/20 hover:bg-white/[0.035]"
                    >
                      <div className="p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                              <Icon className="h-5 w-5 text-violet-300" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-medium text-white">
                                {item.title}
                              </h3>

                              <p className="mt-1 truncate text-xs text-white/35">
                                {item.file_name ||
                                  "No file"}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(
                              item.status
                            )}
                          </span>
                        </div>

                        {course && (
                          <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/50">
                            <BookOpen className="h-3.5 w-3.5" />
                            {course.code} ·{" "}
                            {course.name}
                          </div>
                        )}

                        {item.description && (
                          <p className="mb-4 line-clamp-2 text-sm leading-6 text-white/45">
                            {item.description}
                          </p>
                        )}

                        <div className="mb-4 flex items-center gap-3 text-xs text-white/30">
                          <span>
                            {formatFileSize(
                              item.file_size
                            )}
                          </span>

                          <span>•</span>

                          <span>
                            {formatDate(
                              item.created_at
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedHomework(
                                item
                              )
                            }
                            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/65 transition hover:bg-white/[0.07] hover:text-white"
                          >
                            View details
                          </button>

                          <button
                            type="button"
                            disabled={
                              isAnalyzing
                            }
                            onClick={() =>
                              analyzeHomework(
                                item
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenFile(
                              item
                            )
                          }
                          className="inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Open file
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              item
                            )
                          }
                          className="rounded-lg p-1.5 text-white/25 transition hover:bg-red-500/10 hover:text-red-300"
                          title="Delete homework"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* ======================================== */}
        {/* UPLOAD MODAL */}
        {/* ======================================== */}

        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#100b19] shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Upload homework
                  </h2>

                  <p className="mt-1 text-xs text-white/35">
                    PDF, TXT, PNG, JPG, JPEG, or WEBP ·
                    max 20 MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!uploading) {
                      setShowUploadModal(
                        false
                      );
                      setError("");
                    }
                  }}
                  className="rounded-lg p-2 text-white/35 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={
                  handleUpload
                }
                className="space-y-5 p-6"
              >
                <div>
                  <label className="mb-2 block text-xs font-medium text-white/60">
                    Title
                  </label>

                  <input
                    value={title}
                    onChange={(event) =>
                      setTitle(
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Physics Problem Set 3"
                    className="input"
                    disabled={uploading}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-white/60">
                    Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target
                          .value
                      )
                    }
                    placeholder="Optional notes about this homework..."
                    rows={3}
                    className="input resize-none"
                    disabled={uploading}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-white/60">
                      Course
                    </label>

                    <select
                      value={courseId}
                      onChange={(event) => {
                        setCourseId(
                          event.target
                            .value
                        );
                        setAssignmentId(
                          ""
                        );
                      }}
                      className="input"
                      disabled={uploading}
                    >
                      <option value="">
                        No course
                      </option>

                      {courses.map(
                        (course) => (
                          <option
                            key={
                              course.id
                            }
                            value={
                              course.id
                            }
                          >
                            {course.code} ·{" "}
                            {course.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-white/60">
                      Assignment
                    </label>

                    <select
                      value={
                        assignmentId
                      }
                      onChange={(event) =>
                        setAssignmentId(
                          event.target
                            .value
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
                              courseId
                        )
                        .map(
                          (
                            assignment
                          ) => (
                            <option
                              key={
                                assignment.id
                              }
                              value={
                                assignment.id
                              }
                            >
                              {
                                assignment.title
                              }
                            </option>
                          )
                        )}
                    </select>
                  </div>
                </div>

                {/* FILE DROP AREA */}

                <label className="block cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/png,image/jpeg,image/webp"
                    onChange={
                      handleFileChange
                    }
                    disabled={
                      uploading
                    }
                  />

                  <div
                    className={`rounded-2xl border border-dashed p-8 text-center transition ${
                      selectedFile
                        ? "border-violet-400/30 bg-violet-500/[0.06]"
                        : "border-white/[0.12] bg-white/[0.02] hover:border-violet-400/30 hover:bg-violet-500/[0.04]"
                    }`}
                  >
                    {selectedFile ? (
                      <>
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                          {(() => {
                            const Icon =
                              getFileIcon(
                                selectedFile.type
                              );

                            return (
                              <Icon className="h-6 w-6 text-violet-300" />
                            );
                          })()}
                        </div>

                        <div className="text-sm font-medium text-white">
                          {
                            selectedFile.name
                          }
                        </div>

                        <div className="mt-1 text-xs text-white/35">
                          {formatFileSize(
                            selectedFile.size
                          )}
                        </div>

                        <div className="mt-3 text-xs text-violet-300">
                          Click to replace
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04]">
                          <Upload className="h-6 w-6 text-white/40" />
                        </div>

                        <div className="text-sm font-medium text-white/75">
                          Choose a homework file
                        </div>

                        <div className="mt-1 text-xs text-white/30">
                          PDF, TXT, PNG, JPG, JPEG, WEBP
                        </div>
                      </>
                    )}
                  </div>
                </label>

                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!uploading) {
                        setShowUploadModal(
                          false
                        );
                        setError("");
                      }
                    }}
                    className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/55 transition hover:bg-white/[0.04] hover:text-white"
                    disabled={
                      uploading
                    }
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

        {/* ======================================== */}
        {/* DETAILS MODAL */}
        {/* ======================================== */}

        {selectedHomework && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#100b19] shadow-2xl shadow-black/60">
              <div className="flex items-start justify-between border-b border-white/[0.06] px-6 py-5">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${getStatusClass(
                        selectedHomework.status
                      )}`}
                    >
                      {getStatusLabel(
                        selectedHomework.status
                      )}
                    </span>
                  </div>

                  <h2 className="truncate text-xl font-semibold text-white">
                    {
                      selectedHomework.title
                    }
                  </h2>

                  <p className="mt-1 text-xs text-white/35">
                    {selectedHomework.file_name ||
                      "No file attached"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedHomework(
                      null
                    )
                  }
                  className="rounded-lg p-2 text-white/35 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[calc(90vh-100px)] overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
                  {/* SIDEBAR */}

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-white/30">
                        File
                      </div>

                      <div className="flex items-center gap-3">
                        {(() => {
                          const Icon =
                            getFileIcon(
                              selectedHomework.file_type
                            );

                          return (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                              <Icon className="h-5 w-5 text-violet-300" />
                            </div>
                          );
                        })()}

                        <div className="min-w-0">
                          <div className="truncate text-sm text-white">
                            {selectedHomework.file_name ||
                              "No file"}
                          </div>

                          <div className="mt-1 text-xs text-white/35">
                            {formatFileSize(
                              selectedHomework.file_size
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenFile(
                            selectedHomework
                          )
                        }
                        disabled={
                          !selectedHomework.file_path
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/65 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Open file
                      </button>
                    </div>

                    {getCourse(
                      selectedHomework.course_id
                    ) && (
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-white/30">
                          Course
                        </div>

                        {(() => {
                          const course =
                            getCourse(
                              selectedHomework.course_id
                            );

                          return (
                            <>
                              <div className="text-sm font-medium text-white">
                                {course?.code}
                              </div>

                              <div className="mt-1 text-xs leading-5 text-white/40">
                                {course?.name}
                              </div>

                              {course?.professor && (
                                <div className="mt-2 text-xs text-white/30">
                                  {course.professor}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        analyzeHomework(
                          selectedHomework
                        )
                      }
                      disabled={
                        analyzing ||
                        !selectedHomework.file_path
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                  </div>

                  {/* AI CONTENT */}

                  <div className="space-y-5">
                    {selectedHomework.description && (
                      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                        <h3 className="mb-3 text-sm font-semibold text-white">
                          Description
                        </h3>

                        <p className="whitespace-pre-wrap text-sm leading-7 text-white/50">
                          {
                            selectedHomework.description
                          }
                        </p>
                      </section>
                    )}

                    {selectedHomework.ai_summary ? (
                      <>
                        <section className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.05] p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-300" />

                            <h3 className="text-sm font-semibold text-white">
                              AI Summary
                            </h3>
                          </div>

                          <p className="whitespace-pre-wrap text-sm leading-7 text-white/60">
                            {
                              selectedHomework.ai_summary
                            }
                          </p>
                        </section>

                        {selectedHomework.ai_explanation && (
                          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                            <div className="mb-3 flex items-center gap-2">
                              <Brain className="h-4 w-4 text-cyan-300" />

                              <h3 className="text-sm font-semibold text-white">
                                Explanation
                              </h3>
                            </div>

                            <div className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                              {
                                selectedHomework.ai_explanation
                              }
                            </div>
                          </section>
                        )}

                        {selectedHomework.ai_solution && (
                          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                            <div className="mb-3 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-300" />

                              <h3 className="text-sm font-semibold text-white">
                                Solution
                              </h3>
                            </div>

                            <div className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                              {
                                selectedHomework.ai_solution
                              }
                            </div>
                          </section>
                        )}

                        {selectedHomework.ai_hints &&
                          selectedHomework.ai_hints.length >
                            0 && (
                            <section className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-5">
                              <div className="mb-4 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-amber-300" />

                                <h3 className="text-sm font-semibold text-white">
                                  Hints
                                </h3>
                              </div>

                              <div className="space-y-3">
                                {selectedHomework.ai_hints.map(
                                  (
                                    hint,
                                    index
                                  ) => (
                                    <div
                                      key={`${selectedHomework.id}-hint-${index}`}
                                      className="flex gap-3"
                                    >
                                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-[11px] font-medium text-amber-300">
                                        {index +
                                          1}
                                      </div>

                                      <p className="pt-0.5 text-sm leading-6 text-white/50">
                                        {
                                          hint
                                        }
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            </section>
                          )}
                      </>
                    ) : (
                      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                          <Sparkles className="h-7 w-7 text-violet-300" />
                        </div>

                        <h3 className="text-base font-medium text-white">
                          Ready for AI analysis
                        </h3>

                        <p className="mt-2 max-w-md text-sm leading-6 text-white/35">
                          StudySpace can read your
                          uploaded homework and explain
                          the concepts, solution approach,
                          and useful hints.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            analyzeHomework(
                              selectedHomework
                            )
                          }
                          disabled={
                            analyzing ||
                            !selectedHomework.file_path
                          }
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                          <p className="mt-3 text-xs text-red-300/70">
                            No file is attached to this
                            homework record.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}