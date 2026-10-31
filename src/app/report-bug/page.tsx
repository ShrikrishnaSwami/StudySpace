"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

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
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!alive) return;
      if (authError || !data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      setUserEmail(data.user.email || "");
      setLoading(false);
    });
    return () => { alive = false; };
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
      setMessage("Your report was sent privately to the StudySpace admin team. You can return here if you need to send another.");
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
          <label className="block space-y-2 text-sm text-white/65"><span>What happened?</span><textarea required minLength={10} maxLength={8000} rows={7} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What did you expect, what happened instead, and how can we reproduce it?" className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white outline-none focus:border-violet-400/40"/></label>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/30">We attach the current page and browser version to help investigate.</p><button type="submit" disabled={submitting || title.trim().length<4 || description.trim().length<10} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50">{submitting?"Sending…":"Send report"}<Send size={15}/></button></div>
        </form>
      </section>
    </div>
  </AppShell>;
}
