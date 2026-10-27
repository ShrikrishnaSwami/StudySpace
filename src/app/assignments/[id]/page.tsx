
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
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
  assigned_to?: string | null;
  course_id: string;
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
  courses: Course | null;
};

type WorkingFile = {
  id: string;
  assignment_id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number;
  created_at: string;
};

type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  attempt_number: number;
  status: "draft" | "ready_to_submit" | "submitted";
  submission_note: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  grade?: number | null;
  feedback?: string | null;
  graded_at?: string | null;
};

type SubmissionFile = {
  id: string;
  submission_id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number;
  created_at: string;
};

const supabase = createClient();

const WORK_BUCKET = "assignment-files";
const SUBMISSION_BUCKET = "assignment-submissions";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
  "csv", "txt", "zip", "png", "jpg", "jpeg", "webp",
];

function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function FileIcon({ name }: { name: string }) {
  const extension = fileExtension(name);
  let Icon = File;

  if (["png", "jpg", "jpeg", "webp"].includes(extension)) {
    Icon = FileImage;
  } else if (["xls", "xlsx", "csv"].includes(extension)) {
    Icon = FileSpreadsheet;
  } else if (["doc", "docx"].includes(extension)) {
    Icon = FileType2;
  } else if (["pdf", "ppt", "pptx", "txt"].includes(extension)) {
    Icon = FileText;
  } else if (extension === "zip") {
    Icon = FileArchive;
  }

  return <Icon className="h-4 w-4" />;
}

function StatusLabel({ status }: { status: Submission["status"] }) {
  const styles = {
    draft: "border-white/10 bg-white/[0.04] text-white/60",
    ready_to_submit: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    submitted: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  };

  const labels = {
    draft: "Draft",
    ready_to_submit: "Ready to submit",
    submitted: "Submitted",
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/40">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default function AssignmentWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const workingInput = useRef<HTMLInputElement>(null);
  const submissionInput = useRef<HTMLInputElement>(null);

  const assignmentId = params.id;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [workingFiles, setWorkingFiles] = useState<WorkingFile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionFiles, setSubmissionFiles] = useState<SubmissionFile[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fileError, setFileError] = useState("");
  const [dragTarget, setDragTarget] = useState<"working" | "submission" | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submissionNote, setSubmissionNote] = useState("");
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    updateCurrentTime();

    const interval = window.setInterval(updateCurrentTime, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const activeSubmission = useMemo(
    () => submissions[0] ?? null,
    [submissions],
  );

  useEffect(() => {
    setSubmissionNote(activeSubmission?.submission_note ?? "");
  }, [activeSubmission?.id, activeSubmission?.submission_note]);

  const activeSubmissionFiles = useMemo(
    () =>
      activeSubmission
        ? submissionFiles.filter((file) => file.submission_id === activeSubmission.id)
        : [],
    [activeSubmission, submissionFiles],
  );

  const isSubmitted = activeSubmission?.status === "submitted";
  const isOverdue = Boolean(
    assignment?.due_date &&
    currentTime !== null &&
    new Date(assignment.due_date).getTime() < currentTime &&
    !isSubmitted,
  );

  const loadAssignment = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: queryError } = await supabase
      .from("assignments")
      .select(`
        id, user_id, assigned_to, course_id, title, description, due_date,
        priority, status, progress, points, max_points,
        created_at, updated_at,
        courses (id, code, name)
      `)
      .eq("id", assignmentId)
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .single();

    if (queryError) {
      console.error(queryError);
      setError("Couldn't load this assignment. Check that it exists and belongs to your account.");
    } else {
      setAssignment(data as unknown as Assignment);
    }

    setLoading(false);
  }, [assignmentId, router]);

  const loadFilesAndSubmissions = useCallback(async () => {
    setLoadingFiles(true);
    setFileError("");

    try {
      const [workingResult, submissionsResult] = await Promise.all([
        supabase
          .from("assignment_attachments")
          .select("*")
          .eq("assignment_id", assignmentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("assignment_submissions")
          .select("id, assignment_id, user_id, attempt_number, status, submission_note, submitted_at, created_at, updated_at, grade, feedback, graded_at")
          .eq("assignment_id", assignmentId)
          .order("attempt_number", { ascending: false }),
      ]);

      if (workingResult.error) throw workingResult.error;
      if (submissionsResult.error) throw submissionsResult.error;

      const loadedSubmissions = (submissionsResult.data ?? []) as Submission[];
      const submissionIds = loadedSubmissions.map((item) => item.id);

      const submissionFilesResult = submissionIds.length
        ? await supabase
            .from("assignment_submission_files")
            .select("*")
            .in("submission_id", submissionIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null };

      if (submissionFilesResult.error) throw submissionFilesResult.error;

      setWorkingFiles((workingResult.data ?? []) as WorkingFile[]);
      setSubmissions(loadedSubmissions);
      setSubmissionFiles((submissionFilesResult.data ?? []) as SubmissionFile[]);
    } catch (loadError) {
      console.error("Failed to load assignment files and submissions:", loadError);
      setFileError(
        loadError instanceof Error
          ? loadError.message
          : "Couldn't load assignment files and submission history. Please retry.",
      );
    } finally {
      setLoadingFiles(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAssignment();
      void loadFilesAndSubmissions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAssignment, loadFilesAndSubmissions]);

  useEffect(() => {
    const channel = supabase.channel(`assignment-workspace-${assignmentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions", filter: `assignment_id=eq.${assignmentId}` }, () => {
        void loadFilesAndSubmissions();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submission_files" }, () => {
        void loadFilesAndSubmissions();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [assignmentId, loadFilesAndSubmissions]);

  async function updateAssignment(changes: Partial<Assignment>) {
    if (!assignment) return;

    setBusy(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("assignments")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", assignment.id)
      .eq("user_id", assignment.user_id)
      .select(`
        id, user_id, course_id, title, description, due_date,
        priority, status, progress, points, max_points,
        created_at, updated_at,
        courses (id, code, name)
      `)
      .single();

    if (updateError) {
      setError(updateError.message);
    } else {
      setAssignment(data as unknown as Assignment);
    }

    setBusy(false);
  }

  async function startNewAttempt() {
    if (!assignment) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return null;
    }

    const nextAttempt =
      Math.max(0, ...submissions.map((item) => item.attempt_number)) + 1;

    const { data, error: insertError } = await supabase
      .from("assignment_submissions")
      .insert({
        assignment_id: assignment.id,
        user_id: user.id,
        attempt_number: nextAttempt,
        status: "draft",
      })
      .select("*")
      .single();

    if (insertError) {
      console.error(insertError);
      setError(`Couldn't start a submission: ${insertError.message}`);
      return null;
    }

    const created = data as Submission;
    setSubmissions((current) =>
      [created, ...current].sort((a, b) => b.attempt_number - a.attempt_number),
    );
    setNotice(`Submission attempt ${nextAttempt} created.`);
    return created;
  }

  async function validateAndUpload(
    fileList: FileList | File[],
    mode: "working" | "submission",
  ) {
    if (!assignment) return;

    setFileError("");
    setNotice("");

    const files = Array.from(fileList);
    if (!files.length) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    if (mode === "submission" && activeSubmission?.status === "submitted") {
      setFileError("This attempt is already submitted. Start a new attempt to upload revised files.");
      return;
    }

    setBusy(true);

    try {
      let targetSubmission = activeSubmission;

      if (mode === "submission" && !targetSubmission) {
        const newSubmission = await startNewAttempt();
        if (!newSubmission) return;
        targetSubmission = newSubmission;
      }

      if (mode === "submission" && targetSubmission?.status === "submitted") {
        const newSubmission = await startNewAttempt();
        if (!newSubmission) return;
        targetSubmission = newSubmission;
      }

      let uploadedCount = 0;

      for (const file of files) {
        const extension = fileExtension(file.name);

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
          setFileError(`${file.name}: this file type isn't supported.`);
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          setFileError(`${file.name}: maximum file size is 50 MB.`);
          continue;
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uniqueName = `${Date.now()}_${crypto.randomUUID()}_${safeName}`;

        if (mode === "working") {
          const storagePath = `${user.id}/${assignment.id}/${uniqueName}`;

          const { error: storageError } = await supabase.storage
            .from(WORK_BUCKET)
            .upload(storagePath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });

          if (storageError) {
            setFileError(`Couldn't upload ${file.name}: ${storageError.message}`);
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
            await supabase.storage.from(WORK_BUCKET).remove([storagePath]);
            setFileError(`Couldn't save ${file.name} to the assignment.`);
            continue;
          }
        } else {
          if (!targetSubmission) continue;

          const storagePath =
            `${user.id}/${assignment.id}/${targetSubmission.id}/${uniqueName}`;

          const { error: storageError } = await supabase.storage
            .from(SUBMISSION_BUCKET)
            .upload(storagePath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });

          if (storageError) {
            setFileError(`Couldn't upload ${file.name}: ${storageError.message}`);
            continue;
          }

          const { error: metadataError } = await supabase
            .from("assignment_submission_files")
            .insert({
              submission_id: targetSubmission.id,
              user_id: user.id,
              file_name: file.name,
              storage_path: storagePath,
              file_type: file.type || null,
              file_size: file.size,
            });

          if (metadataError) {
            await supabase.storage.from(SUBMISSION_BUCKET).remove([storagePath]);
            setFileError(`Couldn't save ${file.name} to the submission.`);
            continue;
          }

          // The attempt becomes ready once it contains final files.
          await supabase
            .from("assignment_submissions")
            .update({
              status: "ready_to_submit",
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetSubmission.id)
            .eq("user_id", user.id)
            .neq("status", "submitted");
        }

        uploadedCount++;
      }

      await loadFilesAndSubmissions();

      if (uploadedCount > 0) {
        setNotice(
          `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded successfully.`,
        );
      }
    } finally {
      setBusy(false);
      if (workingInput.current) workingInput.current.value = "";
      if (submissionInput.current) submissionInput.current.value = "";
    }
  }

  async function downloadFile(
    bucket: string,
    storagePath: string,
    fileName: string,
  ) {
    const { data, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60);

    if (urlError || !data?.signedUrl) {
      setFileError(`Couldn't create a download link for ${fileName}.`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeWorkingFile(file: WorkingFile) {
    if (!window.confirm(`Remove "${file.file_name}" from your working files?`)) {
      return;
    }

    setBusy(true);

    const { error: storageError } = await supabase.storage
      .from(WORK_BUCKET)
      .remove([file.storage_path]);

    if (storageError) {
      setFileError(`Couldn't remove the stored file: ${storageError.message}`);
      setBusy(false);
      return;
    }

    const { error: rowError } = await supabase
      .from("assignment_attachments")
      .delete()
      .eq("id", file.id);

    if (rowError) {
      setFileError(`Couldn't remove the file record: ${rowError.message}`);
    } else {
      setWorkingFiles((current) => current.filter((item) => item.id !== file.id));
    }

    setBusy(false);
  }

  async function removeSubmissionFile(file: SubmissionFile) {
    const submission = submissions.find((item) => item.id === file.submission_id);

    if (!submission || submission.status === "submitted") {
      setFileError("Submitted files are locked. Start a new attempt to make changes.");
      return;
    }

    if (!window.confirm(`Remove "${file.file_name}" from this submission draft?`)) {
      return;
    }

    setBusy(true);

    const { error: storageError } = await supabase.storage
      .from(SUBMISSION_BUCKET)
      .remove([file.storage_path]);

    if (storageError) {
      setFileError(`Couldn't remove the stored file: ${storageError.message}`);
      setBusy(false);
      return;
    }

    const { error: rowError } = await supabase
      .from("assignment_submission_files")
      .delete()
      .eq("id", file.id);

    if (rowError) {
      setFileError(`Couldn't remove the file record: ${rowError.message}`);
    } else {
      setSubmissionFiles((current) => current.filter((item) => item.id !== file.id));

      const remaining = submissionFiles.filter(
        (item) =>
          item.submission_id === submission.id && item.id !== file.id,
      );

      const nextStatus = remaining.length ? "ready_to_submit" : "draft";

      await supabase
        .from("assignment_submissions")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission.id)
        .eq("user_id", submission.user_id);

      await loadFilesAndSubmissions();
    }

    setBusy(false);
  }

  async function saveSubmissionDraft() {
    if (!activeSubmission || activeSubmission.status === "submitted") return;

    setBusy(true);
    setError("");
    setFileError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBusy(false);
      router.push("/login");
      return;
    }

    const nextStatus = activeSubmissionFiles.length > 0
      ? "ready_to_submit"
      : "draft";

    const { data, error: saveError } = await supabase
      .from("assignment_submissions")
      .update({
        submission_note: submissionNote.trim() || null,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeSubmission.id)
      .eq("user_id", user.id)
      .neq("status", "submitted")
      .select("*")
      .single();

    if (saveError || !data) {
      console.error(saveError);
      setFileError(`Couldn't save this draft. ${saveError?.message ?? "This attempt may already be submitted."}`);
      setBusy(false);
      return;
    }

    setSubmissions((current) =>
      current.map((item) => item.id === data.id ? (data as Submission) : item),
    );
    setNotice("Draft saved. You can come back and finish it later.");
    setBusy(false);
  }

  async function submitFinalWork() {
    if (!activeSubmission || !assignment) return;

    if (activeSubmissionFiles.length === 0) {
      setFileError("Add at least one final file before submitting.");
      setConfirmSubmit(false);
      return;
    }

    setBusy(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBusy(false);
      router.push("/login");
      return;
    }

    const { data, error: submitError } = await supabase
      .from("assignment_submissions")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submission_note: submissionNote.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeSubmission.id)
      .eq("user_id", user.id)
      .neq("status", "submitted")
      .select("*")
      .single();

    if (submitError || !data) {
      console.error(submitError);
      setError(
        `Submission failed. ${submitError?.message ?? "This attempt may already be submitted."}`,
      );
      setBusy(false);
      setConfirmSubmit(false);
      return;
    }

    setSubmissions((current) =>
      current.map((item) => item.id === data.id ? (data as Submission) : item),
    );

    setConfirmSubmit(false);
    setNotice("Your assignment has been submitted successfully.");
    setBusy(false);

    await updateAssignment({
      status: "completed",
      progress: 100,
    });
    await loadFilesAndSubmissions();
  }

  async function deleteAssignment() {
    if (!assignment) return;

    if (!window.confirm("Delete this assignment and its submission records? This cannot be undone.")) {
      return;
    }

    setBusy(true);

    // Remove storage objects first; the DB cascade removes metadata and submissions.
    const workingPaths = workingFiles.map((file) => file.storage_path);
    const submittedPaths = submissionFiles.map((file) => file.storage_path);

    if (workingPaths.length) {
      const { error: e } = await supabase.storage.from(WORK_BUCKET).remove(workingPaths);
      if (e) {
        setError(`Couldn't remove working files: ${e.message}`);
        setBusy(false);
        return;
      }
    }

    if (submittedPaths.length) {
      const { error: e } = await supabase.storage.from(SUBMISSION_BUCKET).remove(submittedPaths);
      if (e) {
        setError(`Couldn't remove submission files: ${e.message}`);
        setBusy(false);
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignment.id)
      .eq("user_id", assignment.user_id);

    if (deleteError) {
      setError(deleteError.message);
      setBusy(false);
      return;
    }

    router.push("/assignments");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, mode: "working" | "submission") {
    event.preventDefault();
    setDragTarget(null);
    if (event.dataTransfer.files.length) {
      void validateAndUpload(event.dataTransfer.files, mode);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </main>
    );
  }

  if (!assignment) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/assignments" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to assignments
        </Link>
        <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300">
          {error || "Assignment not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/assignments" className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All assignments
          </Link>
          <button
            onClick={deleteAssignment}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/45 transition hover:border-red-400/20 hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>

        <section className="border-b border-white/10 pb-7">
          <div className="flex flex-wrap items-center gap-2">
            {assignment.courses && (
              <Link
                href={`/courses/${assignment.course_id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/55 hover:text-white"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {assignment.courses.code} · {assignment.courses.name}
              </Link>
            )}
            <span className={`rounded-md border px-2.5 py-1 text-xs ${
              assignment.priority === "high"
                ? "border-red-400/20 bg-red-400/10 text-red-300"
                : assignment.priority === "medium"
                ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                : "border-white/10 text-white/45"
            }`}>
              {assignment.priority} priority
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {assignment.title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/45">
            <span className={`inline-flex items-center gap-2 ${isOverdue ? "text-red-300" : ""}`}>
              <CalendarDays className="h-4 w-4" />
              {isOverdue ? "Overdue · " : "Due "}
              {formatDate(assignment.due_date)}
            </span>
            {assignment.max_points !== null && (
              <span>{assignment.max_points} points</span>
            )}
            <span className="inline-flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              {workingFiles.length} working files
            </span>
          </div>

          {assignment.description && (
            <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-white/60">
              {assignment.description}
            </p>
          )}
        </section>

        {error && (
          <div className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {notice}
          </div>
        )}

        {fileError && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{fileError}</span>
            <button type="button" onClick={() => setFileError("")} aria-label="Dismiss file error" className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-9">
            {/* Working files are not submitted automatically. */}
            <section>
              <SectionHeading
                title="Working files"
                description="Notes, research, drafts and other materials you're still working on."
                action={
                  <button
                    onClick={() => workingInput.current?.click()}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/65 transition hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Add files
                  </button>
                }
              />

              <input
                ref={workingInput}
                type="file"
                multiple
                hidden
                accept={ALLOWED_EXTENSIONS.map((x) => `.${x}`).join(",")}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  if (event.target.files) {
                    void validateAndUpload(event.target.files, "working");
                  }
                }}
              />

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragTarget("working");
                }}
                onDragLeave={() => setDragTarget(null)}
                onDrop={(event) => handleDrop(event, "working")}
                className={`mb-3 rounded-xl border border-dashed p-4 text-center text-xs transition ${
                  dragTarget === "working"
                    ? "border-purple-400/50 bg-purple-400/10 text-purple-200"
                    : "border-white/10 text-white/35"
                }`}
              >
                Drop working files here · up to 50 MB each
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10">
                {loadingFiles ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                  </div>
                ) : workingFiles.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-white/35">
                    No working files yet.
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.07]">
                    {workingFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/45">
                          <FileIcon name={file.file_name} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white/75">{file.file_name}</p>
                          <p className="mt-1 text-xs text-white/30">
                            {formatSize(file.file_size)} · {formatDate(file.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadFile(WORK_BUCKET, file.storage_path, file.file_name)}
                          title="Download"
                          aria-label={`Download ${file.file_name}`}
                          className="rounded-md p-2 text-white/35 hover:bg-white/[0.06] hover:text-white"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void removeWorkingFile(file)}
                          title="Remove"
                          className="rounded-md p-2 text-white/30 hover:bg-red-400/10 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Final submission and its history. */}
            <section>
              <SectionHeading
                title="Final submission"
                description="Only files in this section count as your submitted work."
                action={
                  isSubmitted ? (
                    <button
                      onClick={() => void startNewAttempt()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/65 hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" /> New attempt
                    </button>
                  ) : !activeSubmission ? (
                    <button
                      onClick={() => void startNewAttempt()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" /> Start submission
                    </button>
                  ) : (
                    <StatusLabel status={activeSubmission.status} />
                  )
                }
              />

              {activeSubmission && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      Attempt {activeSubmission.attempt_number}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      {activeSubmission.submitted_at
                        ? `Submitted ${formatDateTime(activeSubmission.submitted_at)}`
                        : `Created ${formatDateTime(activeSubmission.created_at)}`}
                    </p>
                  </div>
                  <StatusLabel status={activeSubmission.status} />
                </div>
              )}

              {!activeSubmission && (
                <div className="rounded-xl border border-dashed border-white/10 px-5 py-9 text-center">
                  <Send className="mx-auto h-6 w-6 text-white/25" />
                  <p className="mt-3 text-sm text-white/55">No submission attempt yet</p>
                  <p className="mt-1 text-xs text-white/35">
                    Start an attempt when you&apos;re ready to prepare your final files.
                  </p>
                </div>
              )}

              {activeSubmission?.status === "submitted" && activeSubmission.grade != null && (
                <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/80">Your result</p>
                      <h3 className="mt-1 text-2xl font-bold text-white">{activeSubmission.grade} / {assignment?.max_points ?? 100} points</h3>
                      <p className="mt-1 text-xs text-white/35">{activeSubmission.graded_at ? `Graded ${formatDateTime(activeSubmission.graded_at)}` : "Grade returned"}</p>
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  </div>
                  {activeSubmission.feedback && <div className="mt-4 border-t border-white/[0.08] pt-4"><p className="mb-1 text-xs font-medium text-white/45">Feedback</p><p className="whitespace-pre-wrap text-sm leading-6 text-white/75">{activeSubmission.feedback}</p></div>}
                </div>
              )}
              {activeSubmission?.status === "submitted" && activeSubmission.grade == null && (
                <div className="mb-5 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3 text-sm text-amber-100/70">Your work has been submitted.</div>
              )}

              {activeSubmission && (
                <>
                  <input
                    ref={submissionInput}
                    type="file"
                    multiple
                    hidden
                    accept={ALLOWED_EXTENSIONS.map((x) => `.${x}`).join(",")}
                    disabled={busy || isSubmitted}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      if (event.target.files) {
                        void validateAndUpload(event.target.files, "submission");
                      }
                    }}
                  />

                  {!isSubmitted && (
                    <div
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragTarget("submission");
                      }}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={(event) => handleDrop(event, "submission")}
                      className={`mb-3 rounded-xl border border-dashed p-6 text-center transition ${
                        dragTarget === "submission"
                          ? "border-purple-400/50 bg-purple-400/10"
                          : "border-white/10 bg-white/[0.015]"
                      }`}
                    >
                      <Upload className="mx-auto h-5 w-5 text-white/35" />
                      <p className="mt-2 text-sm text-white/65">
                        Add your final files
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        PDF, Word, PowerPoint, Excel, images, ZIP and more
                      </p>
                      <button
                        onClick={() => submissionInput.current?.click()}
                        disabled={busy}
                        className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.05] disabled:opacity-50"
                      >
                        Choose final files
                      </button>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-xl border border-white/10">
                    {activeSubmissionFiles.length === 0 ? (
                      <p className="px-5 py-7 text-center text-sm text-white/35">
                        No final files attached to this attempt yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-white/[0.07]">
                        {activeSubmissionFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/[0.07] text-emerald-300/70">
                              <FileIcon name={file.file_name} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-white/75">{file.file_name}</p>
                              <p className="mt-1 text-xs text-white/30">
                                {formatSize(file.file_size)} · {formatDate(file.created_at)}
                              </p>
                            </div>
                            <button
                              onClick={() => downloadFile(SUBMISSION_BUCKET, file.storage_path, file.file_name)}
                              title="Download"
                              className="rounded-md p-2 text-white/35 hover:bg-white/[0.06] hover:text-white"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            {!isSubmitted && (
                              <button
                                onClick={() => void removeSubmissionFile(file)}
                                title="Remove from draft"
                                className="rounded-md p-2 text-white/30 hover:bg-red-400/10 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isSubmitted && (
                    <div className="mt-4 rounded-xl border border-white/10 p-4">
                      <label htmlFor="submission-note" className="text-sm font-medium text-white/70">
                        Note to accompany your submission (optional)
                      </label>
                      <textarea
                        id="submission-note"
                        value={submissionNote}
                        onChange={(event) => setSubmissionNote(event.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Add a note about your work..."
                        className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-purple-400/40"
                      />

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-white/35">
                          {activeSubmissionFiles.length} final file(s) attached
                        </p>
                        <button
                          onClick={() => void saveSubmissionDraft()}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Save draft
                        </button>
                        <button
                          onClick={() => setConfirmSubmit(true)}
                          disabled={busy || activeSubmissionFiles.length === 0}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Send className="h-4 w-4" />
                          Submit final work
                        </button>
                      </div>
                    </div>
                  )}

                  {isSubmitted && (
                    <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                        <div>
                          <p className="text-sm font-medium text-emerald-200">
                            This attempt has been submitted
                          </p>
                          <p className="mt-1 text-sm leading-6 text-white/45">
                            The final files for this attempt are locked. If you need to make changes, create a new attempt.
                          </p>
                          {activeSubmission.submission_note && (
                            <p className="mt-3 whitespace-pre-wrap text-sm text-white/60">
                              {activeSubmission.submission_note}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {submissions.length > 1 && (
              <section>
                <SectionHeading
                  title="Submission history"
                  description="Earlier attempts remain available for reference."
                />
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 last:border-b-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-white/75">
                          Attempt {submission.attempt_number}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          {submission.submitted_at
                            ? `Submitted ${formatDateTime(submission.submitted_at)}`
                            : `Created ${formatDateTime(submission.created_at)}`}
                        </p>
                      </div>
                      <StatusLabel status={submission.status} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <SectionHeading
                title="Get help"
                description="Need help understanding the instructions or course concepts?"
              />
              <Link
                href={`/ai-tutor?course=${assignment.course_id}&assignment=${assignment.id}`}
                className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-purple-400/20 hover:bg-purple-400/[0.04]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-400/10 text-purple-300">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/75">Open AI Tutor</p>
                  <p className="mt-1 text-xs leading-5 text-white/35">
                    Ask questions and work through the concepts step by step.
                  </p>
                </div>
                <ArrowLeft className="h-4 w-4 rotate-180 text-white/25 transition group-hover:translate-x-1" />
              </Link>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">
                  Assignment progress
                </p>
                <span className="text-lg font-semibold text-white">{assignment.progress}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-purple-400 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, assignment.progress))}%` }}
                />
              </div>
              <input
                aria-label="Assignment progress"
                type="range"
                min="0"
                max="100"
                step="5"
                value={assignment.progress}
                disabled={busy || isSubmitted}
                onChange={(event) => {
                  const progress = Number(event.target.value);
                  setAssignment((current) =>
                    current ? { ...current, progress } : current,
                  );
                }}
                onMouseUp={(event) => {
                  const progress = Number((event.target as HTMLInputElement).value);
                  void updateAssignment({
                    progress,
                    status: progress === 100
                      ? "completed"
                      : progress > 0
                      ? "in_progress"
                      : "pending",
                  });
                }}
                onTouchEnd={(event) => {
                  const progress = Number((event.target as HTMLInputElement).value);
                  void updateAssignment({
                    progress,
                    status: progress === 100
                      ? "completed"
                      : progress > 0
                      ? "in_progress"
                      : "pending",
                  });
                }}
                className="mt-4 w-full accent-purple-400"
              />
              <p className="mt-2 text-xs text-white/35">
                Submitting final work marks the assignment complete.
              </p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">
                Due date
              </p>
              <div className="mt-4 flex items-start gap-3">
                <Clock3 className={`mt-0.5 h-4 w-4 ${isOverdue ? "text-red-300" : "text-white/45"}`} />
                <div>
                  <p className={`text-sm font-medium ${isOverdue ? "text-red-300" : "text-white/75"}`}>
                    {isOverdue ? "Past due" : assignment.due_date ? "Due date" : "No due date"}
                  </p>
                  <p className="mt-1 text-xs text-white/35">{formatDate(assignment.due_date)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">
                Current submission
              </p>
              <div className="mt-4">
                {activeSubmission ? (
                  <>
                    <StatusLabel status={activeSubmission.status} />
                    <p className="mt-3 text-sm text-white/65">
                      Attempt {activeSubmission.attempt_number}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/35">
                      {activeSubmission.status === "submitted"
                        ? "Your files for this attempt are locked."
                        : "Remember to submit your final files when you're ready."}
                    </p>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-white/40">
                    You haven&apos;t started a submission attempt yet.
                  </p>
                )}
              </div>
            </section>

            {assignment.max_points !== null && (
              <section className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">
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
          </aside>
        </div>
      </div>

      {confirmSubmit && activeSubmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#17151d] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Submit final work?</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  You&apos;ll submit {activeSubmissionFiles.length} file(s) in attempt {activeSubmission.attempt_number}.
                  You won&apos;t be able to change these files after submitting. You can create another attempt later.
                </p>
                {isOverdue && (
                  <p className="mt-3 text-sm text-red-300">
                    This submission is past the assignment due date and will be marked late.
                  </p>
                )}
              </div>
              <button
                onClick={() => setConfirmSubmit(false)}
                disabled={busy}
                className="text-white/35 hover:text-white"
                aria-label="Close confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmSubmit(false)}
                disabled={busy}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.05]"
              >
                Go back
              </button>
              <button
                onClick={() => void submitFinalWork()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm submission
              </button>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-white/10 bg-[#17151d] px-3 py-2 text-xs text-white/60 shadow-xl">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving changes…
        </div>
      )}
    </main>
  );
}
