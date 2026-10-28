"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep diagnostic details in server/client logs, never expose them to students.
    console.error("StudySpace route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#07050b] px-5 py-16 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl shadow-violet-950/20 sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <AlertTriangle size={26} aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">StudySpace</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/60">
          This page hit an unexpected problem. Your saved work should remain safe. Try again, or return to your dashboard.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07050b]"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Dashboard
          </Link>
        </div>
        {error.digest ? <p className="mt-6 text-xs text-white/30">Reference: {error.digest}</p> : null}
      </section>
    </main>
  );
}
