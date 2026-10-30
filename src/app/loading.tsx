"use client";

import { useEffect, useState } from "react";
import StudySpaceMark from "@/components/StudySpaceMark";

const stages = [
  "Preparing your space",
  "Gathering your courses",
  "Setting your day in order",
  "Almost ready",
];

export default function Loading() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStage((current) => (current + 1) % stages.length);
    }, 1900);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main
      id="main-content"
      aria-label="Loading StudySpace"
      aria-busy="true"
      className="atelier-loading"
    >
      <div className="atelier-loading-grain" aria-hidden="true" />
      <div className="atelier-loading-halo atelier-loading-halo-one" aria-hidden="true" />
      <div className="atelier-loading-halo atelier-loading-halo-two" aria-hidden="true" />

      <div className="atelier-loading-layout">
        <header className="atelier-loading-header">
          <StudySpaceMark size={34} />
          <span>STUDYSPACE</span>
          <span className="atelier-loading-header-rule" />
          <span className="atelier-loading-edition">THE STUDENT EDITION</span>
        </header>

        <section className="atelier-loading-center">
          <div className="atelier-loading-orbit-stage" aria-hidden="true">
            <span className="atelier-loading-orbit atelier-loading-orbit-outer" />
            <span className="atelier-loading-orbit atelier-loading-orbit-inner" />
            <span className="atelier-loading-orbit atelier-loading-orbit-vertical" />
            <span className="atelier-loading-orbit-dot" />
            <span className="atelier-loading-core">
              <StudySpaceMark size={56} />
            </span>
            <span className="atelier-loading-cross atelier-loading-cross-one" />
            <span className="atelier-loading-cross atelier-loading-cross-two" />
          </div>

          <p className="atelier-loading-eyebrow">A MOMENT, PLEASE</p>
          <h1>Making room<br /><em>for what matters.</em></h1>
          <div className="atelier-loading-status" aria-live="polite">
            <span className="atelier-loading-status-dot" />
            <span>{stages[stage]}</span>
          </div>
          <div className="atelier-loading-track" role="presentation">
            <span key={stage} className="atelier-loading-track-fill" />
          </div>
          <p className="atelier-loading-caption">
            YOUR ACADEMIC WORLD, COMING TOGETHER
          </p>
        </section>

        <footer className="atelier-loading-footer">
          <span>STUDYSPACE</span>
          <span className="atelier-loading-footer-line" />
          <span>AN INTENTIONAL SPACE TO LEARN</span>
        </footer>
      </div>
    </main>
  );
}
