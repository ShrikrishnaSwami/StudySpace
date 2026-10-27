"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  GraduationCap,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Course = {
  id: string;
  code: string;
  name: string;
};

type Assignment = {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: "not_started" | "in_progress" | "completed";
  progress: number;
  points: number | null;
  max_points: number | null;
  created_at: string;
  updated_at: string;
  courses: Course | null;
};

type Attachment = {
  id: string;
  assignment_id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number;
  created_at: string;
};

const supabase = createClient();

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "zip",
  "png",
  "jpg",
  "jpeg",
  "webp",
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateString: string | null) {
  if (!dateString) return "No due date";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
}

function getFileIcon(fileName: string) {
  const extension = getFileExtension(fileName);

  if (["png", "jpg", "jpeg", "webp"].includes(extension)) {
    return FileImage;
  }

  if (["xls", "xlsx", "csv"].includes(extension)) {
    return FileSpreadsheet;
  }

  if (["doc", "docx"].includes(extension)) {
    return FileType2;
  }

  if (["ppt", "pptx"].includes(extension)) {
    return FileText;
  }

  if (extension === "pdf") {
    return FileText;
  }

  if (extension === "zip") {
    return FileArchive;
  }

  return File;
}

function getPriorityLabel(priority: Assignment["priority"]) {
  if (priority === "high") return "High priority";
  if (priority === "medium") return "Medium priority";
  return "Low priority";
}

function getPriorityClass(priority: Assignment["priority"]) {
  if (priority === "high") {
    return "border-red-400/20 bg-red-400/10 text-red-300";
  }

  if (priority === "medium") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-white/10 bg-white/[0.04] text-white/55";
}

function getStatusLabel(status: Assignment["status"]) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

function getStatusClass(status: Assignment["status"]) {
  if (status === "completed") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "in_progress") {
    return "border-purple-400/20 bg-purple-400/10 text-purple-300";
  }

  return "border-white/10 bg-white/[0.04] text-white/55";
}

function isOverdue(assignment: Assignment) {
  if (!assignment.due_date || assignment.status === "completed") {
    return false;
  }

  return new Date(assignment.due_date).getTime() < Date.now();
}

export default function AssignmentWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const assignmentId = params?.id;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [updating, setUpdating] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const loadAssignment = useCallback(async () => {
    if (!assignmentId) return;

    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: assignmentError } = await supabase
      .from("assignments")
      .select(
        `
          id,
          user_id,
          course_id,
          title,
          description,
          due_date,
          priority,
          status,
          progress,
          points,
          max_points,
          created_at,
          updated_at,
          courses (
            id,
            code,
            name
          )
        `,
      )
      .eq("id", assignmentId)
      .eq("user_id", user.id)
      .single();

    if (assignmentError) {
      console.error(assignmentError);
      setError("We couldn't load this assignment.");
      setLoading(false);
      return;
    }

    setAssignment(data as unknown as Assignment);
    setLoading(false);
  }, [assignmentId, router]);

  const loadAttachments = useCallback(async () => {
    if (!assignmentId) return;

    setLoadingFiles(true);

    const { data, error: attachmentError } = await supabase
      .from("assignment_attachments")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: false });

    if (attachmentError) {
      console.error(attachmentError);
      setLoadingFiles(false);
      return;
    }

    setAttachments((data ?? []) as Attachment[]);
    setLoadingFiles(false);
  }, [assignmentId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAssignment();
      void loadAttachments();
    });
  }, [loadAssignment, loadAttachments]);

  const daysUntilDue = useMemo(() => {
    if (!assignment?.due_date) return null;

    const now = new Date();
    const due = new Date(assignment.due_date);

    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startDue = new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate(),
    );

    return Math.ceil(
      (startDue.getTime() - startToday.getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }, [assignment?.due_date]);

  async function updateAssignment(
    changes: Partial<Assignment>,
  ) {
    if (!assignment) return;

    setUpdating(true);

    const { data, error: updateError } = await supabase
      .from("assignments")
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id)
      .eq("user_id", assignment.user_id)
      .select(
        `
          id,
          user_id,
          course_id,
          title,
          description,
          due_date,
          priority,
          status,
          progress,
          points,
          max_points,
          created_at,
          updated_at,
          courses (
            id,
            code,
            name
          )
        `,
      )
      .single();

    if (updateError) {
      console.error(updateError);
      setError(updateError.message);
      setUpdating(false);
      return;
    }

    setAssignment(data as unknown as Assignment);
    setUpdating(false);
  }

  async function handleProgressChange(progress: number) {
    let status: Assignment["status"] = "not_started";

    if (progress >= 100) {
      status = "completed";
      progress = 100;
    } else if (progress > 0) {
      status = "in_progress";
    }

    await updateAssignment({
      progress,
      status,
    });
  }

  async function handleStatusChange(
    status: Assignment["status"],
  ) {
    let progress = assignment?.progress ?? 0;

    if (status === "completed") {
      progress = 100;
    }

    if (status === "not_started") {
      progress = 0;
    }

    await updateAssignment({
      status,
      progress,
    });
  }

  function validateFile(file: File) {
    const extension = getFileExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `.${extension || "file"} files aren't supported.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is larger than the 50 MB limit.`;
    }

    return "";
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!assignment) return;

    setUploadError("");

    const fileArray = Array.from(files);

    if (!fileArray.length) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUploading(true);

    try {
      for (const file of fileArray) {
        const validationError = validateFile(file);

        if (validationError) {
          setUploadError(validationError);
          continue;
        }

        const safeFileName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .replace(/_+/g, "_");

        const uniqueName = `${Date.now()}_${crypto.randomUUID()}_${safeFileName}`;

        const storagePath = `${user.id}/${assignment.id}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from("assignment-files")
          .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          console.error(uploadError);
          setUploadError(
            `Couldn't upload ${file.name}: ${uploadError.message}`,
          );
          continue;
        }

        const { error: metadataError } = await supabase
          .from("assignment_attachments")
          .insert({
            assignment_id: assignment.id,
            user_id: user.id,
            file_name: file.name,
            storage_path: storagePath,
            file_type: file.type || null,
            file_size: file.size,
          });

        if (metadataError) {
          console.error(metadataError);

          await supabase.storage
            .from("assignment-files")
            .remove([storagePath]);

          setUploadError(
            `The file uploaded but couldn't be saved to the assignment.`,
          );

          continue;
        }
      }

      await loadAttachments();
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleFileInput(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    if (event.target.files) {
      await uploadFiles(event.target.files);
    }
  }

  async function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setDragActive(false);

    if (event.dataTransfer.files) {
      await uploadFiles(event.dataTransfer.files);
    }
  }

  async function downloadAttachment(
    attachment: Attachment,
  ) {
    const { data, error: signedUrlError } = await supabase.storage
      .from("assignment-files")
      .createSignedUrl(attachment.storage_path, 60);

    if (signedUrlError || !data?.signedUrl) {
      setUploadError(
        "Couldn't create a download link for this file.",
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteAttachment(
    attachment: Attachment,
  ) {
    const confirmed = window.confirm(
      `Remove "${attachment.file_name}" from this assignment?`,
    );

    if (!confirmed) return;

    setUploadError("");

    const { error: storageError } = await supabase.storage
      .from("assignment-files")
      .remove([attachment.storage_path]);

    if (storageError) {
      console.error(storageError);
    }

    const { error: metadataError } = await supabase
      .from("assignment_attachments")
      .delete()
      .eq("id", attachment.id);

    if (metadataError) {
      console.error(metadataError);
      setUploadError(
        "The file could not be removed from the assignment.",
      );
      return;
    }

    setAttachments((current) =>
      current.filter((file) => file.id !== attachment.id),
    );
  }

  async function deleteAssignment() {
    if (!assignment) return;

    setDeleting(true);

    for (const attachment of attachments) {
      await supabase.storage
        .from("assignment-files")
        .remove([attachment.storage_path]);
    }

    const { error: deleteError } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignment.id)
      .eq("user_id", assignment.user_id);

    if (deleteError) {
      console.error(deleteError);
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.push("/assignments");
  }

  function getDueMessage() {
    if (!assignment?.due_date) {
      return "No due date";
    }

    if (isOverdue(assignment)) {
      return "Overdue";
    }

    if (daysUntilDue === 0) {
      return "Due today";
    }

    if (daysUntilDue === 1) {
      return "Due tomorrow";
    }

    if (daysUntilDue !== null && daysUntilDue > 1) {
      return `Due in ${daysUntilDue} days`;
    }

    return formatDate(assignment.due_date);
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1200px] items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      </main>
    );
  }

  if (error || !assignment) {
    return (
      <main className="min-h-[calc(100vh-80px)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <Link
            href="/assignments"
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to assignments
          </Link>

          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8">
            <h1 className="text-xl font-semibold text-white">
              Assignment unavailable
            </h1>

            <p className="mt-2 text-sm text-white/50">
              {error || "We couldn't find this assignment."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-[calc(100vh-80px)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link
              href="/assignments"
              className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to assignments
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowMenu((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/55 transition hover:bg-white/[0.07] hover:text-white"
                aria-label="Assignment actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-11 z-30 w-44 rounded-xl border border-white/10 bg-[#17151d] p-1.5 shadow-2xl">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete assignment
                  </button>
                </div>
              )}
            </div>
          </div>

          <section className="border-b border-white/10 pb-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {assignment.courses && (
                    <Link
                      href={`/courses/${assignment.course_id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-white/60 transition hover:border-white/20 hover:text-white"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {assignment.courses.code}
                    </Link>
                  )}

                  <span
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${getPriorityClass(
                      assignment.priority,
                    )}`}
                  >
                    {getPriorityLabel(assignment.priority)}
                  </span>
                </div>

                <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {assignment.title}
                </h1>

                {assignment.courses && (
                  <p className="mt-2 text-sm text-white/45">
                    {assignment.courses.name}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-white/50">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{getDueMessage()}</span>
                  </div>

                  {assignment.max_points !== null && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>
                        {assignment.max_points} points
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    <span>
                      {attachments.length}{" "}
                      {attachments.length === 1
                        ? "file"
                        : "files"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <select
                  value={assignment.status}
                  onChange={(event) =>
                    handleStatusChange(
                      event.target
                        .value as Assignment["status"],
                    )
                  }
                  disabled={updating}
                  className={`cursor-pointer appearance-none rounded-lg border px-3 py-2 pr-8 text-sm font-medium outline-none transition ${getStatusClass(
                    assignment.status,
                  )}`}
                >
                  <option value="not_started">
                    Not started
                  </option>
                  <option value="in_progress">
                    In progress
                  </option>
                  <option value="completed">
                    Completed
                  </option>
                </select>
              </div>
            </div>
          </section>

          <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Description
                    </h2>
                    <p className="mt-1 text-sm text-white/40">
                      What you need to complete.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
                  {assignment.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-white/65">
                      {assignment.description}
                    </p>
                  ) : (
                    <p className="text-sm text-white/35">
                      No description has been added to this
                      assignment.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Assignment files
                    </h2>
                    <p className="mt-1 text-sm text-white/40">
                      Keep everything you need for this assignment
                      together.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={uploading}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add files
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    accept={ALLOWED_EXTENSIONS.map(
                      (extension) => `.${extension}`,
                    ).join(",")}
                    onChange={handleFileInput}
                  />
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={handleDrop}
                  className={`mb-4 rounded-xl border border-dashed p-6 text-center transition ${
                    dragActive
                      ? "border-purple-400/50 bg-purple-400/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] text-white/50">
                    <Upload className="h-5 w-5" />
                  </div>

                  <p className="mt-3 text-sm font-medium text-white/70">
                    Drop files here
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    PDF, Word, PowerPoint, Excel, images, ZIP and
                    more · up to 50 MB each
                  </p>
                </div>

                {uploadError && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-400/5 px-3.5 py-3 text-sm text-red-300">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-white/10">
                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <File className="mx-auto h-7 w-7 text-white/20" />
                      <p className="mt-3 text-sm font-medium text-white/50">
                        No files yet
                      </p>
                      <p className="mt-1 text-xs text-white/30">
                        Upload your assignment materials here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {attachments.map((attachment) => {
                        const Icon = getFileIcon(
                          attachment.file_name,
                        );

                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.025]"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white/45">
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-sm font-medium text-white/75"
                                title={attachment.file_name}
                              >
                                {attachment.file_name}
                              </p>

                              <p className="mt-0.5 text-xs text-white/30">
                                {formatFileSize(
                                  attachment.file_size,
                                )}{" "}
                                ·{" "}
                                {formatDateTime(
                                  attachment.created_at,
                                )}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                onClick={() =>
                                  downloadAttachment(attachment)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-md text-white/40 transition hover:bg-white/[0.07] hover:text-white"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() =>
                                  deleteAttachment(attachment)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-md text-white/30 transition hover:bg-red-400/10 hover:text-red-300"
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-white">
                    Study with this assignment
                  </h2>
                  <p className="mt-1 text-sm text-white/40">
                    Use your course context while working through
                    the assignment.
                  </p>
                </div>

                <Link
                  href={`/ai-tutor?course=${assignment.course_id}&assignment=${assignment.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-purple-400/20 hover:bg-purple-400/[0.04]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-400/10 text-purple-300">
                    <MessageSquare className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/75">
                      Open AI Tutor
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/35">
                      Ask questions about the course material or
                      get help understanding the assignment.
                    </p>
                  </div>

                  <ArrowLeft className="h-4 w-4 rotate-180 text-white/25 transition group-hover:translate-x-1 group-hover:text-white/60" />
                </Link>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                      Progress
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {assignment.progress}%
                    </p>
                  </div>

                  {assignment.status === "completed" && (
                    <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  )}
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-purple-400 transition-all"
                    style={{
                      width: `${assignment.progress}%`,
                    }}
                  />
                </div>

                <div className="mt-5">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={assignment.progress}
                    onChange={(event) =>
                      setAssignment((current) =>
                        current
                          ? {
                              ...current,
                              progress: Number(
                                event.target.value,
                              ),
                            }
                          : current,
                      )
                    }
                    onMouseUp={(event) =>
                      handleProgressChange(
                        Number(
                          (event.target as HTMLInputElement)
                            .value,
                        ),
                      )
                    }
                    onTouchEnd={(event) =>
                      handleProgressChange(
                        Number(
                          (event.target as HTMLInputElement)
                            .value,
                        ),
                      )
                    }
                    className="w-full accent-purple-400"
                  />
                </div>

                <div className="mt-3 flex justify-between text-xs text-white/30">
                  <span>Not started</span>
                  <span>Complete</span>
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                  Due date
                </p>

                <div className="mt-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-white/45">
                    <Clock3 className="h-4 w-4" />
                  </div>

                  <div>
                    <p
                      className={`text-sm font-medium ${
                        isOverdue(assignment)
                          ? "text-red-300"
                          : "text-white/75"
                      }`}
                    >
                      {getDueMessage()}
                    </p>

                    {assignment.due_date && (
                      <p className="mt-1 text-xs text-white/30">
                        {formatDate(assignment.due_date)}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {assignment.max_points !== null && (
                <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                    Grading
                  </p>

                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-2xl font-semibold text-white">
                      {assignment.points ?? "—"}
                    </span>

                    <span className="pb-1 text-sm text-white/35">
                      / {assignment.max_points} points
                    </span>
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                  Assignment
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/35">
                      Status
                    </span>

                    <span className="text-white/65">
                      {getStatusLabel(assignment.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/35">
                      Priority
                    </span>

                    <span className="text-white/65">
                      {getPriorityLabel(assignment.priority)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/35">
                      Files
                    </span>

                    <span className="text-white/65">
                      {attachments.length}
                    </span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#17151d] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Delete assignment?
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/45">
                  This will permanently delete{" "}
                  <span className="text-white/70">
                    {assignment.title}
                  </span>{" "}
                  and its uploaded files.
                </p>
              </div>

              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-white/30 transition hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/55 transition hover:bg-white/[0.05] hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={deleteAssignment}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {deleting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Delete assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}