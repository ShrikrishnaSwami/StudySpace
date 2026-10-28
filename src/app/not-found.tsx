import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, GraduationCap } from "lucide-react";

export default function NotFound() {
  return (
    <main className="ss-error-page">
      <div className="ss-error-grid" aria-hidden="true" />
      <div className="ss-error-glow ss-error-glow-one" aria-hidden="true" />
      <div className="ss-error-glow ss-error-glow-two" aria-hidden="true" />
      <div className="ss-error-layout">
        <Link href="/" className="ss-error-brand">
          <span className="ss-error-brand-mark"><GraduationCap size={18} /></span>
          <span>studyspace<span>.</span></span>
        </Link>
        <section className="ss-error-card ss-not-found-card" aria-labelledby="not-found-title">
          <div className="ss-error-visual ss-not-found-visual">
            <span className="ss-error-orbit ss-error-orbit-a" />
            <span className="ss-error-orbit ss-error-orbit-b" />
            <span className="ss-error-icon"><Compass size={27} /></span>
            <span className="ss-error-spark ss-error-spark-a">?</span>
            <span className="ss-error-spark ss-error-spark-b">✦</span>
          </div>
          <p className="ss-error-eyebrow">404 · Off the map</p>
          <h1 id="not-found-title">Looks like this page skipped class.</h1>
          <p className="ss-error-copy">We couldn’t find the page you were looking for. The link may have changed, but your next step is easy: head back to your workspace and pick up where you left off.</p>
          <div className="ss-error-actions">
            <Link href="/dashboard" className="ss-error-primary"><ArrowLeft size={16} /> Back to workspace</Link>
            <Link href="/" className="ss-error-secondary">Explore StudySpace <ArrowRight size={16} /></Link>
          </div>
        </section>
        <p className="ss-error-footnote">STUDYSPACE <span>·</span> MAKE ROOM FOR WHAT MATTERS</p>
      </div>
    </main>
  );
}
