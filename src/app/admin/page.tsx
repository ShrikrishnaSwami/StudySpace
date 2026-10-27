"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

type Stats = { totalUsers: number; generatedAt: string };
const blank: Stats = { totalUsers: 0, generatedAt: "" };

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
      if (!response.ok) throw new Error(body.error || "Could not load total users.");
      setStats({ totalUsers: Number(body.totalUsers) || 0, generatedAt: body.generatedAt || "" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load total users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { router.replace("/login"); return; }
      if (!isAdminEmail(user.email)) { router.replace("/dashboard"); return; }
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200">
            <ShieldCheck size={14} /> Owner access
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="mt-2 text-sm text-white/45">Total registered users on StudySpace.</p>
        </div>
        <button onClick={() => void load()} disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm hover:bg-white/[0.08] disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="rounded-xl bg-violet-500/10 p-3 text-violet-300"><Users size={22} /></div>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <p className="text-sm text-white/50">Total users</p>
        <p className="mt-2 text-5xl font-semibold tabular-nums">{loading && !stats.generatedAt ? "…" : stats.totalUsers.toLocaleString()}</p>
        <p className="mt-4 text-xs text-white/35">
          {stats.generatedAt ? "Last updated " + new Date(stats.generatedAt).toLocaleString() : "Waiting for the first successful refresh."}
          {" · "}Automatically refreshes every 30 seconds
        </p>
      </section>
    </div>
  </AppShell>;
}
