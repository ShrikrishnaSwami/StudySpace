import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#07050b] px-5 py-16 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
          <SearchX size={26} aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">StudySpace</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">We couldn’t find that page</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/60">
          The link may be outdated, or the page may have moved. Head back to your workspace and continue studying.
        </p>
        <Link
          href="/dashboard"
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07050b]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
