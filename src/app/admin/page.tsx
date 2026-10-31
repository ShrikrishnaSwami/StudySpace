"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Activity, Archive, Bug, CheckCircle2, Clock3, ExternalLink, RefreshCw, Send, ShieldAlert, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Stats = {
  totalUsers: number;
  aiRequests24h: number;
  aiFeedback7d: number;
  aiHelpful7d: number;
  aiUnhelpful7d: number;
  generatedAt: string;
};
type BugReport = { id: string; user_id: string; reporter_email: string; category: string; severity: string; title: string; description: string; page_url: string; browser_info: string; status: "new" | "in_progress" | "resolved"; admin_response: string; created_at: string; updated_at: string; };
type BackupStatus = {
  configured: boolean;
  status: "not_configured" | "running" | "success" | "failed";
  startedAt?: string | null;
  completedAt?: string | null;
  runId?: string | null;
  runUrl?: string | null;
  message?: string;
  manifest?: { storage?: string; retention_days?: number; artifact_name?: string };
};
const blank: Stats = { totalUsers: 0, aiRequests24h: 0, aiFeedback7d: 0, aiHelpful7d: 0, aiUnhelpful7d: 0, generatedAt: "" };
const blankBackup: BackupStatus = { configured: false, status: "not_configured" };

function dateLabel(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<Stats>(blank);
  const [backup, setBackup] = useState<BackupStatus>(blankBackup);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [error, setError] = useState("");
  const [backupError, setBackupError] = useState("");
  const [adminMfaVerified, setAdminMfaVerified] = useState<boolean | null>(null);
  const [mfaChallengeRequired, setMfaChallengeRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [reports, setReports] = useState<BugReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [reportReplies, setReportReplies] = useState<Record<string, string>>({});
  const [savingReportId, setSavingReportId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Sign in again.");
      const response = await fetch("/api/admin/stats", {
        headers: { Authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      const body = await response.json();
      if (response.status === 403 && body.code === "MFA_REQUIRED") {
        setMfaChallengeRequired(true);
        setError("Administrator MFA verification is required before sensitive admin data can be viewed.");
        return;
      }
      if (response.status === 403) { router.replace("/dashboard"); return; }
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(body.error || "Could not load admin statistics.");
      setStats({
        totalUsers: Number(body.totalUsers) || 0,
        aiRequests24h: Number(body.aiRequests24h) || 0,
        aiFeedback7d: Number(body.aiFeedback7d) || 0,
        aiHelpful7d: Number(body.aiHelpful7d) || 0,
        aiUnhelpful7d: Number(body.aiUnhelpful7d) || 0,
        generatedAt: body.generatedAt || "",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load admin statistics.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadBackup = useCallback(async () => {
    setBackupLoading(true);
    setBackupError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Sign in again.");
      const response = await fetch("/api/admin/backups", {
        headers: { Authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      const body = await response.json();
      if (response.status === 403 && body.code === "MFA_REQUIRED") {
        setMfaChallengeRequired(true);
        setBackupError("Administrator MFA verification is required before backup status can be viewed.");
        return;
      }
      if (response.status === 403) { router.replace("/dashboard"); return; }
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(body.error || "Could not load backup status.");
      setBackup({
        configured: Boolean(body.configured),
        status: body.status || "not_configured",
        startedAt: body.startedAt || null,
        completedAt: body.completedAt || null,
        runId: body.runId || null,
        runUrl: body.runUrl || null,
        message: body.message || "",
        manifest: body.manifest || {},
      });
    } catch (cause) {
      setBackupError(cause instanceof Error ? cause.message : "Could not load backup status.");
    } finally {
      setBackupLoading(false);
    }
  }, [router]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError("");
    try {
      const { data, error } = await supabase.from("bug_reports").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      setReports((data || []) as BugReport[]);
    } catch (cause) {
      setReportsError(cause instanceof Error ? cause.message : "Could not load bug reports. Verify administrator MFA and refresh.");
    } finally {
      setReportsLoading(false);
    }
  }, []);

  async function updateBugReport(report: BugReport, status: BugReport["status"]) {
    setSavingReportId(report.id);
    setReportsError("");
    try {
      const reply = reportReplies[report.id] ?? report.admin_response ?? "";
      const { error } = await supabase.from("bug_reports").update({
        status,
        admin_response: reply.trim(),
      }).eq("id", report.id);
      if (error) throw error;
      await loadReports();
    } catch (cause) {
      setReportsError(cause instanceof Error ? cause.message : "Could not update this report.");
    } finally {
      setSavingReportId("");
    }
  }

  async function verifyAdminMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = mfaCode.replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) { setMfaError("Enter the current six-digit code from your authenticator app."); return; }
    setMfaBusy(true);
    setMfaError("");
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const factor = (factors?.totp || []).find((item) => item.status === "verified");
      if (!factor) { setAdminMfaVerified(false); throw new Error("No verified authenticator was found. Open Settings and enrol one first."); }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
      if (verifyError) throw verifyError;
      setAdminMfaVerified(true); setMfaChallengeRequired(false); setMfaCode(""); setError(""); setBackupError("");
      await Promise.all([load(), loadBackup(), loadReports()]);
    } catch (cause) { setMfaError(cause instanceof Error ? cause.message : "Could not verify your authenticator code."); }
    finally { setMfaBusy(false); }
  }
  useEffect(() => {
    let alive = true;
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { router.replace("/login"); return; }
      // Client navigation is only a convenience gate; every privileged API independently validates identity and AAL2.
      if (user.app_metadata?.role !== "admin" || !user.email_confirmed_at) {
        router.replace("/dashboard");
        return;
      }
      void supabase.auth.mfa.listFactors().then(({ data, error: factorError }) => {
        if (!alive) return;
        const hasVerifiedTotp = !factorError && (data?.totp || []).some((factor) => factor.status === "verified");
        setAdminMfaVerified(hasVerifiedTotp);
      }).catch(() => {
        if (alive) setAdminMfaVerified(false);
      });
      setChecking(false);
      void load();
      void loadBackup();
      void loadReports();
    }
    void checkAccess();
    const timer = window.setInterval(() => { void load(); void loadBackup(); void loadReports(); }, 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [router, load, loadBackup, loadReports]);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-[#080611] text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400" />
        <p className="text-sm text-white/40">Checking admin access…</p>
      </div>
    </div>;
  }

  const backupState = {
    success: { label: "Last run succeeded", icon: CheckCircle2, classes: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" },
    running: { label: "Backup in progress", icon: Clock3, classes: "border-sky-400/20 bg-sky-400/10 text-sky-200" },
    failed: { label: "Last run failed", icon: ShieldAlert, classes: "border-red-400/20 bg-red-400/10 text-red-200" },
    not_configured: { label: "Not configured yet", icon: Archive, classes: "border-amber-400/20 bg-amber-400/10 text-amber-200" },
  }[backup.status] || { label: "Not configured yet", icon: Archive, classes: "border-amber-400/20 bg-amber-400/10 text-amber-200" };
  const BackupIcon = backupState.icon;

  return <AppShell title="Admin dashboard" description="Owner tools for account counts and backup status.">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200">
            <ShieldCheck size={14} /> Owner access
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="mt-2 text-sm text-white/45">Check the total number of registered accounts and the latest backup status.</p>
        </div>
        <button type="button" aria-label="Refresh admin statistics and backup status" onClick={() => { void load(); void loadBackup(); }} disabled={loading || backupLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm hover:bg-white/[0.08] disabled:opacity-50">
          <RefreshCw size={16} className={loading || backupLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      {mfaChallengeRequired && adminMfaVerified === true && <section className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.07] p-5" aria-labelledby="admin-mfa-challenge-title">
        <div className="flex items-start gap-3">
          <ShieldCheck size={21} className="mt-0.5 shrink-0 text-violet-200" />
          <div className="min-w-0 flex-1">
            <h2 id="admin-mfa-challenge-title" className="font-semibold text-white">Verify your administrator sign-in</h2>
            <p className="mt-1 text-sm leading-6 text-white/60">Enter the current six-digit code from your authenticator app. Admin data remains blocked until this step succeeds.</p>
            <form onSubmit={verifyAdminMfa} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="block space-y-2"><span className="text-xs text-white/60">Authenticator code</span><input aria-label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="h-11 w-40 rounded-xl border border-white/10 bg-black/25 px-4 text-center text-lg tracking-[0.3em] text-white outline-none focus:border-violet-400/50" placeholder="000000" required /></label>
              <button type="submit" disabled={mfaBusy || mfaCode.length !== 6} className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white disabled:opacity-50">{mfaBusy ? "Verifying…" : "Verify and continue"}</button>
            </form>
            {mfaError && <p role="alert" className="mt-3 text-sm text-red-200">{mfaError}</p>}
          </div>
        </div>
      </section>}

      {adminMfaVerified === false && <section role="alert" className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-200" />
          <div>
            <h2 className="font-semibold text-amber-100">Add multi-factor authentication to the admin account</h2>
            <p className="mt-1 text-sm leading-6 text-white/65">No verified authenticator factor was found for this account. Server-side administrator checks are enabled, but a password alone is not a second factor. Enrol a TOTP authenticator and verify it before inviting external beta users.</p>
            <a className="mt-2 mr-4 inline-flex items-center gap-1 text-sm text-violet-200 underline underline-offset-4" href="/settings">Open Settings to enable MFA</a>
            <a className="mt-2 inline-flex items-center gap-1 text-sm text-violet-200 underline underline-offset-4" href="https://supabase.com/docs/guides/auth/auth-mfa" target="_blank" rel="noreferrer">Supabase MFA setup guide <ExternalLink size={13}/></a>
          </div>
        </div>
      </section>}

      <section id="bug-reports" aria-label="Private bug report inbox" className="scroll-mt-24 rounded-2xl border border-violet-400/15 bg-white/[0.025] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3"><div className="rounded-xl border border-violet-400/15 bg-violet-500/10 p-2.5 text-violet-200"><Bug size={20}/></div><div><h2 className="text-lg font-semibold">Private bug report inbox</h2><p className="mt-1 text-sm text-white/45">Student reports arrive here directly. Reply, track progress, and resolve them without GitHub.</p></div></div>
          <button type="button" onClick={() => void loadReports()} disabled={reportsLoading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 disabled:opacity-50"><RefreshCw size={13} className={reportsLoading ? "animate-spin" : ""}/>Refresh inbox</button>
        </div>
        {reportsError && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{reportsError}</p>}
        {reportsLoading && reports.length === 0 ? <p className="mt-6 text-sm text-white/40">Loading reports…</p> : reports.length === 0 ? <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/10 p-6 text-center"><Bug size={22} className="mx-auto text-white/25"/><p className="mt-3 text-sm font-medium text-white/65">No reports yet</p><p className="mt-1 text-xs text-white/35">New student feedback will appear here.</p></div> : <div className="mt-5 space-y-4">
          {reports.map(report => <article key={report.id} className="rounded-xl border border-white/[0.08] bg-black/10 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{report.title}</h3><span className={"rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide " + (report.severity === "critical" || report.severity === "high" ? "border-red-400/20 bg-red-400/10 text-red-200" : "border-white/10 text-white/45")}>{report.severity}</span><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">{report.status.replace("_", " ")}</span></div><p className="mt-1 text-xs text-white/40">{report.reporter_email || report.user_id} · {report.category} · {dateLabel(report.created_at)}</p></div>
              <span className="text-[10px] text-white/25">{report.id.slice(0, 8)}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/75">{report.description}</p>
            {report.page_url && <p className="mt-3 break-all text-xs text-white/35">Page: {report.page_url}</p>}
            {report.browser_info && <p className="mt-1 break-all text-xs text-white/25">Browser: {report.browser_info}</p>}
            <label className="mt-4 block space-y-2"><span className="text-xs font-medium text-white/55">Private admin response</span><textarea rows={3} maxLength={4000} value={reportReplies[report.id] ?? report.admin_response ?? ""} onChange={event => setReportReplies(current => ({ ...current, [report.id]: event.target.value }))} placeholder="Add investigation notes or a response for the student…" className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-violet-400/40"/></label>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void updateBugReport(report, "in_progress")} disabled={savingReportId === report.id} className="rounded-lg border border-sky-400/20 bg-sky-400/[0.07] px-3 py-2 text-xs text-sky-100 disabled:opacity-50">{savingReportId === report.id ? "Saving…" : "Save / in progress"}</button><button type="button" onClick={() => void updateBugReport(report, "resolved")} disabled={savingReportId === report.id} className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-xs text-emerald-100 disabled:opacity-50">Mark resolved</button><button type="button" onClick={() => void updateBugReport(report, "new")} disabled={savingReportId === report.id} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 disabled:opacity-50">Reopen</button></div>
          </article>)}
        </div>}
      </section>

      <section className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.035] to-fuchsia-500/[0.06] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/55">Registered accounts</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums">{loading && !stats.generatedAt ? "…" : stats.totalUsers.toLocaleString()}</p>
            <p className="mt-3 text-xs text-white/35">All StudySpace accounts</p>
          </div>
          <div className="rounded-xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200"><Users size={24} /></div>
        </div>
      </section>

      <section aria-label="Encrypted off-site backups" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5 text-violet-200"><Archive size={20} /></div>
            <div>
              <h2 className="text-lg font-semibold">Off-site backups</h2>
              <p className="mt-1 max-w-2xl text-sm text-white/45">Encrypted daily copies of application data, private uploads, and an Auth account metadata inventory.</p>
            </div>
          </div>
          <div className={"inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium " + backupState.classes}>
            <BackupIcon size={14} /> {backupLoading ? "Checking status…" : backupState.label}
          </div>
        </div>

        {backupError && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{backupError}</p>}
        {backup.message && <p className="mt-4 text-sm text-white/55">{backup.message}</p>}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
            <p className="text-xs text-white/40">Last backup started</p>
            <p className="mt-1 text-sm text-white/80">{dateLabel(backup.startedAt)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
            <p className="text-xs text-white/40">Last successful upload completed</p>
            <p className="mt-1 text-sm text-white/80">{dateLabel(backup.completedAt)}</p>
          </div>
        </div>

        {backup.status === "success" && <p className="mt-4 text-xs text-white/40">Encrypted archive upload completed. This does not mean a restore drill has passed.</p>}
        {backup.manifest?.storage === "private-github-actions-artifact" && <p className="mt-2 text-xs text-amber-200/80">Free backup artifact retention: {backup.manifest.retention_days || 7} days. Download a copy and complete the restore drill before relying on it.</p>}
        {backup.status !== "success" && <p className="mt-4 text-xs text-white/40">Treat recovery as unverified until a backup is uploaded and a separate test restore succeeds.</p>}

        <div className="mt-4 flex flex-wrap gap-3">
          {backup.runUrl && <a href={backup.runUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 hover:bg-white/[0.05]">View latest workflow <ExternalLink size={14} /></a>}
          <a href="https://github.com/ShrikrishnaSwami/StudySpace/actions/workflows/free-encrypted-backup.yml" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-100 hover:bg-violet-500/15">Open backup workflow <ExternalLink size={14} /></a>
          <a href="https://github.com/ShrikrishnaSwami/StudySpace/blob/main/docs/FREE_BACKUP_INTERIM.md" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 hover:bg-white/[0.05]">Setup and recovery guide <ExternalLink size={14} /></a>
        </div>
      </section>

      <section aria-label="AI usage and quality metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-violet-400/20 hover:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5 text-violet-200"><Sparkles size={19} /></div>
            <Activity size={15} className="text-emerald-300/70" aria-hidden="true" />
          </div>
          <p className="mt-5 text-sm text-white/50">AI requests</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{loading && !stats.generatedAt ? "…" : stats.aiRequests24h.toLocaleString()}</p>
          <p className="mt-2 text-xs text-white/30">Last 24 hours</p>
        </article>
        <article className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-violet-400/20 hover:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5 text-violet-200"><Activity size={19} /></div>
            <span className="text-xs text-white/35">7 days</span>
          </div>
          <p className="mt-5 text-sm text-white/50">AI Tutor helpfulness</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {loading && !stats.generatedAt ? "…" : stats.aiFeedback7d ? Math.round((stats.aiHelpful7d / stats.aiFeedback7d) * 100) + "%" : "—"}
          </p>
          <p className="mt-2 text-xs text-white/35">
            {stats.aiFeedback7d.toLocaleString()} ratings · {stats.aiHelpful7d.toLocaleString()} helpful · {stats.aiUnhelpful7d.toLocaleString()} not helpful
          </p>
          <p className="mt-1 text-xs text-white/25">Aggregate ratings only; no student messages are exposed here.</p>
        </article>
      </section>

      <p className="text-xs text-white/35">
        {stats.generatedAt ? "Last refreshed " + new Date(stats.generatedAt).toLocaleString() : "Waiting for the first successful refresh."}
        {" · "}Automatically refreshes every 30 seconds
      </p>
    </div>
  </AppShell>;
}
