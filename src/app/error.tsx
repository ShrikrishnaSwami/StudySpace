"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, RefreshCw, Sparkles } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("StudySpace route error", { digest: error.digest || "unavailable" });
  }, [error]);

  return (
    <main className="ss-error-page">
      <div className="ss-error-grid" aria-hidden="true" />
      <div className="ss-error-glow ss-error-glow-one" aria-hidden="true" />
      <div className="ss-error-glow ss-error-glow-two" aria-hidden="true" />
      <div className="ss-error-layout">
        <Link href="/" className="ss-error-brand">
          <span className="ss-error-brand-mark"><Sparkles size={17} /></span>
          <span>studyspace<span>.</span></span>
        </Link>
        <section className="ss-error-card" aria-labelledby="error-title">
          <div className="ss-error-visual">
            <span className="ss-error-orbit ss-error-orbit-a" />
            <span className="ss-error-orbit ss-error-orbit-b" />
            <span className="ss-error-icon"><AlertTriangle size={25} /></span>
            <span className="ss-error-spark ss-error-spark-a">✳</span>
            <span className="ss-error-spark ss-error-spark-b">✦</span>
          </div>
          <p className="ss-error-eyebrow">A little detour</p>
          <h1 id="error-title">That wasn’t part of the study plan.</h1>
          <p className="ss-error-copy">Something unexpected interrupted this page. Your saved work should still be there. Give it another try, or head back to your workspace.</p>
          <div className="ss-error-actions">
            <button type="button" onClick={() => reset()} className="ss-error-primary"><RefreshCw size={16} /> Try again</button>
            <Link href="/dashboard" className="ss-error-secondary"><ArrowLeft size={16} /> Back to workspace</Link>
          </div>
          {error.digest ? <p className="ss-error-reference">Support reference <span>{error.digest}</span></p> : null}
        </section>
        <p className="ss-error-footnote">STUDYSPACE <span>·</span> MAKE ROOM FOR WHAT MATTERS</p>
      </div>
    </main>
  );
}
