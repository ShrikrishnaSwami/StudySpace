"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, GraduationCap, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";

const supabase = createClient();

type Assignment = { id: string; title: string; course_id: string; user_id: string; max_points: number | null; due_date: string | null };
type Submission = { id: string; assignment_id: string; user_id: string; attempt_number: number; status: string; submission_note: string | null; submitted_at: string | null; grade: number | null; feedback: string | null; graded_at: string | null; assignment?: Assignment };
type FileRow = { id: string; submission_id: string; file_name: string; storage_path: string; file_type: string | null; file_size: number };

export default function AdminGradingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("submitted");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { router.replace("/login"); return; }
    if (!isAdminEmail(user.email)) { router.replace("/dashboard"); return; }

    const [a, s] = await Promise.all([
      supabase.from("assignments").select("id,title,course_id,user_id,max_points,due_date").order("created_at", { ascending: false }),
      supabase.from("assignment_submissions").select("id,assignment_id,user_id,attempt_number,status,submission_note,submitted_at,grade,feedback,graded_at").order("submitted_at", { ascending: false, nullsFirst: false }),
    ]);
    if (a.error || s.error) {
      setError(a.error?.message || s.error?.message || "Couldn't load grading data.");
      setLoading(false); setChecking(false); return;
    }
    const assignmentRows = (a.data || []) as Assignment[];
    const assignmentMap = new Map(assignmentRows.map((item) => [item.id, item]));
    const submissionRows = ((s.data || []) as Submission[]).map((item) => ({ ...item, assignment: assignmentMap.get(item.assignment_id) }));
    setAssignments(assignmentRows);
    setSubmissions(submissionRows);
    setGrades(Object.fromEntries(submissionRows.map((item) => [item.id, item.grade == null ? "" : String(item.grade)])));
    setFeedback(Object.fromEntries(submissionRows.map((item) => [item.id, item.feedback || ""])));

    const ids = submissionRows.map((item) => item.id);
    if (ids.length) {
      const f = await supabase.from("assignment_submission_files").select("id,submission_id,file_name,storage_path,file_type,file_size").in("submission_id", ids).order("created_at", { ascending: false });
      if (f.error) setError(f.error.message);
      else setFiles((f.data || []) as FileRow[]);
    } else setFiles([]);
    setChecking(false); setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const channel = supabase.channel("admin-grading-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submission_files" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const visible = useMemo(() => submissions.filter((item) => {
    if (filter === "submitted") return item.status === "submitted" && item.grade == null;
    if (filter === "graded") return item.grade != null;
    return true;
  }), [submissions, filter]);

  async function saveGrade(item: Submission) {
    setSaving(item.id); setError(""); setMessage("");
    const raw = grades[item.id]?.trim() ?? "";
    const max = item.assignment?.max_points ?? 100;
    const score = raw === "" ? null : Number(raw);
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > max)) {
      setError(`Grade must be between 0 and ${max} points.`); setSaving(null); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) { setError("Administrator authorization is required."); setSaving(null); return; }
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from("assignment_submissions").update({
      grade: score,
      feedback: feedback[item.id]?.trim() || null,
      graded_by: user.id,
      graded_at: score === null ? null : now,
      updated_at: now,
    }).eq("id", item.id).select("id").single();
    if (updateError) setError(updateError.message);
    else { setMessage("Grade and feedback saved. The student's view updates live."); await load(); }
    setSaving(null);
  }

  async function download(file: FileRow) {
    const { data, error: signedError } = await supabase.storage.from("assignment-submissions").createSignedUrl(file.storage_path, 60);
    if (signedError || !data?.signedUrl) { setError(signedError?.message || "Couldn't create download link."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-[#080611] text-sm text-white/50"><Loader2 className="mr-3 h-5 w-5 animate-spin" />Verifying administrator access…</div>;

  return <AppShell title="Grading & feedback" description="Review submissions and return grades">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <button onClick={() => router.push("/admin")} className="mb-4 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white"><ArrowLeft className="h-4 w-4" />Admin dashboard</button>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300"><ShieldCheck className="h-3.5 w-3.5" />Instructor workspace</div>
          <h1 className="text-3xl font-bold">Grading & feedback</h1>
          <p className="mt-2 text-sm text-white/40">Review student work, assign points, and return actionable feedback.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/65 hover:bg-white/[0.05]"><RefreshCw className="h-4 w-4" />Refresh</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Total submissions", submissions.length],["Awaiting grade", submissions.filter((s) => s.status === "submitted" && s.grade == null).length],["Graded", submissions.filter((s) => s.grade != null).length]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><p className="text-sm text-white/40">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {[["submitted","Needs grading"],["graded","Graded"],["all","All submissions"]].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg border px-3 py-2 text-sm ${filter === value ? "border-violet-400/30 bg-violet-500/10 text-violet-200" : "border-white/10 text-white/45 hover:text-white"}`}>{label}</button>)}
      </div>
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</div>}
      {loading ? <div className="flex justify-center py-16 text-white/45"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading submissions…</div> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center"><GraduationCap className="mx-auto h-8 w-8 text-white/25" /><p className="mt-3 font-medium">No submissions in this view</p><p className="mt-1 text-sm text-white/35">New submissions appear here automatically.</p></div> :
        <div className="space-y-4">{visible.map((item) => {
          const itemFiles = files.filter((file) => file.submission_id === item.id);
          const max = item.assignment?.max_points ?? 100;
          return <article key={item.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs text-violet-300">{item.assignment?.title || "Assignment"} · Attempt {item.attempt_number}</p><h2 className="mt-1 text-lg font-semibold">{item.status === "submitted" ? "Submitted work" : "Draft in progress"}</h2><p className="mt-1 text-xs text-white/35">Student ID: {item.user_id} · {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "Not submitted"}</p></div>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${item.grade == null ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}>{item.grade == null ? "Needs grading" : `Graded: ${item.grade}/${max}`}</span>
            </div>
            {item.submission_note && <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-4"><p className="mb-1 text-xs font-medium text-white/40">Student note</p><p className="whitespace-pre-wrap text-sm leading-6 text-white/75">{item.submission_note}</p></div>}
            <div className="mt-4 space-y-2">{itemFiles.map((file) => <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] px-3 py-3"><span className="truncate text-sm text-white/70">{file.file_name} <span className="text-xs text-white/30">({(file.file_size/1024/1024).toFixed(2)} MB)</span></span><button onClick={() => void download(file)} className="inline-flex items-center gap-2 text-xs text-violet-300 hover:text-violet-200"><Download className="h-3.5 w-3.5" />Download</button></div>)}</div>
            <div className="mt-5 grid gap-4 border-t border-white/[0.07] pt-5 md:grid-cols-[180px_1fr]">
              <div><label className="mb-2 block text-xs text-white/45">Grade (out of {max})</label><input type="number" min="0" max={max} step="0.5" value={grades[item.id] ?? ""} onChange={(e) => setGrades((prev) => ({...prev, [item.id]: e.target.value}))} placeholder={`0 – ${max}`} className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm outline-none focus:border-violet-400/50" /></div>
              <div><label className="mb-2 block text-xs text-white/45">Instructor feedback</label><textarea rows={3} maxLength={10000} value={feedback[item.id] ?? ""} onChange={(e) => setFeedback((prev) => ({...prev, [item.id]: e.target.value}))} placeholder="What went well? What should the student improve?" className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm outline-none focus:border-violet-400/50" /></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/30">{item.graded_at ? `Last graded ${new Date(item.graded_at).toLocaleString()}` : "Not graded yet"}</p><button disabled={saving === item.id || item.status !== "submitted"} onClick={() => void saveGrade(item)} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40">{saving === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving === item.id ? "Saving…" : "Save grade & return feedback"}</button></div>
          </article>;
        })}</div>}
    </div>
  </AppShell>;
}
