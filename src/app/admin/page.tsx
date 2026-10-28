"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw, ShieldCheck, Sparkles, Users } from "lucide-react";
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
const blank: Stats = { totalUsers: 0, aiRequests24h: 0, aiFeedback7d: 0, aiHelpful7d: 0, aiUnhelpful7d: 0, generatedAt: "" };


export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<Stats>(blank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    let alive = true;
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { router.replace("/login"); return; }
      setChecking(false);
      void load();
    }
    void checkAccess();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [router, load]);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-[#080611] text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400" />
        <p className="text-sm text-white/40">Verifying administrator access…</p>
      </div>
    </div>;
  }

  return <AppShell title="Admin dashboard" description="Owner-only StudySpace statistics.">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200">
            <ShieldCheck size={14} /> Owner access
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="mt-2 text-sm text-white/45">A live overview of activity across StudySpace.</p>
        </div>
        <button type="button" aria-label="Refresh admin statistics" onClick={() => void load()} disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm hover:bg-white/[0.08] disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      <section className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.035] to-fuchsia-500/[0.06] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/55">Total registered users</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums">{loading && !stats.generatedAt ? "…" : stats.totalUsers.toLocaleString()}</p>
            <p className="mt-3 text-xs text-white/35">All accounts in Supabase Auth</p>
          </div>
          <div className="rounded-xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200"><Users size={24} /></div>
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
