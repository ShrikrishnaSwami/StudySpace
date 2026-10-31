"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type MyReport = { id: string; title: string; status: string; admin_response: string; created_at: string; };
const MAX_DESCRIPTION_WORDS = 1000;
function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export default function ReportBugPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [category, setCategory] = useState("bug");
  const [severity, setSeverity] = useState("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  const [error, setError] = useState("");
  const descriptionWords = countWords(description);

  useEffect(() => {
    let alive = true;
    let refreshTimer: ReturnType<typeof setInterval> | undefined;
    async function refreshOwnReports(id: string) {
      const { data: ownReports, error: reportsError } = await supabase
        .from("bug_reports")
        .select("id,title,status,admin_response,created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!alive) return;
      if (reportsError) {
        setError("Could not load your private reports. Please refresh the page.");
        return;
      }
      setMyReports((ownReports || []) as MyReport[]);
    }
    void supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!alive) return;
      if (authError || !data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      setUserEmail(data.user.email || "");
      await refreshOwnReports(data.user.id);
      if (alive) {
        setLoading(false);
        // Poll only this signed-in student's rows so admin replies appear without
        // exposing or requesting any other student's reports.
        refreshTimer = setInterval(() => { void refreshOwnReports(data.user.id); }, 15000);
      }
    }).catch(() => {
      if (alive) {
        setError("Could not verify your account. Please sign in again.");
        setLoading(false);
      }
    });
    return () => {
      alive = false;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (title.trim().length < 4 || description.trim().length < 10) {
      setError("Add a short title and at least 10 characters describing the issue.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("bug_reports").insert({
        user_id: userId,
        reporter_email: userEmail,
        category,
        severity,
        title: title.trim(),
        description: description.trim(),
        page_url: typeof window !== "undefined" ? window.location.href : "",
        browser_info: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : "",
      });
      if (insertError) throw insertError;
      setTitle("");
      setDescription("");
      setCategory("bug");
      setSeverity("normal");
      setMessage("Your report was sent privately to the StudySpace admin team.");
      const { data: ownReports } = await supabase.from("bug_reports").select("id,title,status,admin_response,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
      setMyReports((ownReports || []) as MyReport[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#080611] text-sm text-white/45">Checking your account…</div>;

  return <AppShell title="Report a problem" description="Send feedback directly to the StudySpace team.">
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"><ArrowLeft size={15}/> Back to dashboard</Link>
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200"><MessageSquare size={20}/></div>
          <div><h1 className="text-xl font-semibold text-white">Tell us what happened</h1><p className="mt-1 text-sm leading-6 text-white/45">Your report goes to the private admin inbox inside StudySpace—not GitHub. Please don't include passwords, API keys, or another student's private information.</p></div>
        </div>
        {message && <div role="status" className="mt-5 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-sm text-emerald-200"><CheckCircle2 size={17} className="shrink-0"/>{message}</div>}
        {error && <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-sm text-red-200"><AlertCircle size={17} className="shrink-0"/>{error}</div>}
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-white/65"><span>Report type</span><select value={category} onChange={e=>setCategory(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#15131d] px-3 text-white"><option value="bug">Bug / something broken</option><option value="ui">UI / design issue</option><option value="performance">Performance</option><option value="accessibility">Accessibility</option><option value="other">Other feedback</option></select></label>
            <label className="space-y-2 text-sm text-white/65"><span>Priority</span><select value={severity} onChange={e=>setSeverity(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#15131d] px-3 text-white"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
          </div>
          <label className="block space-y-2 text-sm text-white/65"><span>Short title</span><input required minLength={4} maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Notes won't save" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-violet-400/40"/></label>
          <label className="block space-y-2 text-sm text-white/65"><span>What happened?</span><textarea required minLength={10} maxLength={8000} rows={7} value={description} onChange={e=>{setDescription(e.target.value);setMessage("");}} placeholder="What did you expect, what happened instead, and how can we reproduce it?" className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white outline-none focus:border-violet-400/40"/><span className="flex flex-wrap justify-between gap-2 text-[11px] text-white/35"><span>Maximum {MAX_DESCRIPTION_WORDS.toLocaleString()} words and 8,000 characters</span><span className={descriptionWords > MAX_DESCRIPTION_WORDS ? "text-red-300" : "text-white/45"}>{descriptionWords.toLocaleString()} / {MAX_DESCRIPTION_WORDS.toLocaleString()} words · {description.length.toLocaleString()} / 8,000 characters</span></span></label>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/30">We attach the current page and browser version to help investigate.</p><button type="submit" disabled={submitting || title.trim().length<4 || description.trim().length<10 || descriptionWords>MAX_DESCRIPTION_WORDS} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50">{submitting?"Sending…":"Send report"}<Send size={15}/></button></div>
        </form>
        <div className="mt-8 border-t border-white/[0.07] pt-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Your previous reports</h2><p className="mt-1 text-xs text-white/40">Check progress and read replies from the admin.</p></div><span className="text-xs text-white/30">{myReports.length} shown</span></div>
          {myReports.length === 0 ? <p className="mt-4 text-sm text-white/35">No reports submitted yet.</p> : <div className="mt-4 space-y-3">{myReports.map(report => <article key={report.id} className="rounded-xl border border-white/[0.07] bg-black/10 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-white/85">{report.title}</p><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase text-white/50">{report.status.replace("_"," ")}</span></div><p className="mt-1 text-[11px] text-white/30">{new Date(report.created_at).toLocaleString()}</p>{report.admin_response && <div className="mt-3 rounded-lg border border-violet-400/15 bg-violet-500/[0.06] p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">Private reply from the StudySpace admin team</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/75">{report.admin_response}</p></div>}</article>)}</div>}
        </div>
      </section>
    </div>
  </AppShell>;
}
