"use client";

import Link from "next/link";
import StudySpaceMark from "@/components/StudySpaceMark";
import MotionSystem from "@/components/MotionSystem";
import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  Menu,
  Sparkles,
  X,
} from "lucide-react";

const navigation = [
  { label: "The index", href: "#index" },
  { label: "The ritual", href: "#ritual" },
  { label: "The record", href: "#record" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main id="main-content" className="atelier-home">
      <MotionSystem />
      <div className="atelier-grain" aria-hidden="true" />
      <header className="atelier-header">
        <Link href="/" className="atelier-wordmark" aria-label="StudySpace home">
          <StudySpaceMark size={30} animated={false} />
          <span>STUDYSPACE</span>
          <i>®</i>
        </Link>
        <nav className="atelier-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <a href={item.href} key={item.href}>{item.label}</a>
          ))}
        </nav>
        <div className="atelier-header-actions">
          <Link href="/login" className="atelier-login">Sign in</Link>
          <Link href="/signup" className="atelier-enter">Enter <ArrowUpRight size={14} /></Link>
        </div>
        <button className="atelier-menu-button" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </header>

      {menuOpen && (
        <nav className="atelier-mobile-nav" aria-label="Mobile navigation">
          {navigation.map((item) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}<ArrowUpRight size={14} /></a>)}
          <Link href="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link href="/signup" onClick={() => setMenuOpen(false)}>Enter StudySpace <ArrowRight size={15} /></Link>
        </nav>
      )}

      <section className="atelier-opening" aria-labelledby="atelier-title">
        <div className="atelier-opening-meta"><span>AN OPEN SPACE FOR STUDENT LIFE</span><span>EST. MMXXVI · EVERY DAY, IN ORDER</span></div>
        <div className="atelier-opening-center">
          <div className="atelier-orbit atelier-orbit-a" aria-hidden="true" />
          <div className="atelier-orbit atelier-orbit-b" aria-hidden="true" />
          <p className="atelier-overline"><span /> A PLACE TO THINK, MAKE, AND MOVE FORWARD</p>
          <h1 id="atelier-title">The art of a<br /><em>considered</em> semester.</h1>
          <p className="atelier-opening-copy">A quieter place for everything your education asks of you. Your courses, your work, your notes, your time — gathered under one roof.</p>
          <Link href="/signup" className="atelier-primary">Enter StudySpace <ArrowUpRight size={16} /></Link>
          <span className="atelier-opening-note">Made for the work of becoming.</span>
        </div>
        <div className="atelier-opening-bottom"><span>01 — THE HOUSE</span><a href="#index">Discover the rooms <ArrowDown size={13} /></a><span>SCROLL TO EXPLORE</span></div>
      </section>

      <section className="atelier-manifesto">
        <p className="atelier-overline"><span /> THE HOUSE · EVERY PART OF IT · JOINED</p>
        <h2>A place for the work.<br /><em>And room for the rest.</em></h2>
        <p>Student life rarely happens in one place. The lecture, the reading, the deadline, the late-night question. StudySpace brings the pieces together, so your attention can return to what matters.</p>
      </section>

      <section className="atelier-chapter atelier-index" id="index">
        <div className="atelier-chapter-heading">
          <span className="atelier-chapter-number">I · THE INDEX</span>
          <span className="atelier-chapter-rule" />
          <span className="atelier-chapter-caption">COLLECT · CONNECT · KEEP</span>
        </div>
        <div className="atelier-chapter-layout">
          <div className="atelier-chapter-copy">
            <p className="atelier-overline"><span /> A PLACE FOR EVERYTHING</p>
            <h2>Carry nothing<br /><em>twice.</em></h2>
            <p className="atelier-body-copy">A thought belongs somewhere. A reading belongs with its course. An assignment belongs beside the brief that explains it. Keep the materials of your education connected, and find them when you need them.</p>
            <ul className="atelier-feature-list">
              <li><BookOpen size={16} /><span>Courses, notes, and resources</span><ArrowUpRight size={13} /></li>
              <li><FileText size={16} /><span>Assignments and homework uploads</span><ArrowUpRight size={13} /></li>
              <li><Brain size={16} /><span>AI tutor and generated flashcards</span><ArrowUpRight size={13} /></li>
              <li><GraduationCap size={16} /><span>Quizzes, grades, and GPA</span><ArrowUpRight size={13} /></li>
            </ul>
            <Link href="/signup" className="atelier-text-link">Make it yours <ArrowRight size={15} /></Link>
          </div>
          <div className="atelier-index-art" aria-label="Illustration of an organized student library">
            <div className="atelier-art-label">THE LIBRARY <span>VOL. 01 — ∞</span></div>
            <div className="atelier-library-shelf">
              <div className="atelier-book book-one"><small>01</small><b>THE<br />COURSE</b></div>
              <div className="atelier-book book-two"><small>02</small><b>FIELD<br />NOTES</b></div>
              <div className="atelier-book book-three"><small>03</small><b>THE<br />READING</b></div>
              <div className="atelier-book book-four"><small>04</small><b>OPEN<br />QUESTIONS</b></div>
              <div className="atelier-paper"><span>YOUR INDEX</span><strong>Everything<br />in its place.</strong><i>Gathered, not scattered.</i></div>
            </div>
            <div className="atelier-art-foot"><span>AN ORDER OF YOUR OWN</span><span>FIG. 01</span></div>
          </div>
        </div>
      </section>

      <section className="atelier-chapter atelier-ritual" id="ritual">
        <div className="atelier-chapter-heading">
          <span className="atelier-chapter-number">II · THE RITUAL</span>
          <span className="atelier-chapter-rule" />
          <span className="atelier-chapter-caption">PLAN · PRACTISE · PROGRESS</span>
        </div>
        <div className="atelier-chapter-layout reverse">
          <div className="atelier-ritual-art">
            <div className="atelier-art-label">THE DAY, COMPOSED <span>YOUR TIME</span></div>
            <div className="atelier-day-card">
              <div className="atelier-day-top"><span>YOUR STUDY DAY</span><span>01 / 04</span></div>
              <div className="atelier-day-date">A little more<br /><em>intention.</em></div>
              <div className="atelier-timeline">
                <div><time>08:30</time><i className="timeline-dot" /><span><b>Find your focus</b><small>Focus session · 45 min</small></span></div>
                <div><time>10:00</time><i className="timeline-dot" /><span><b>Make sense of the material</b><small>Biology · Course notes</small></span></div>
                <div><time>13:15</time><i className="timeline-dot" /><span><b>Put knowledge to work</b><small>Practice quiz · 20 min</small></span></div>
                <div><time>15:00</time><i className="timeline-dot" /><span><b>Close the open loops</b><small>Assignments · Review</small></span></div>
              </div>
              <div className="atelier-day-footer"><span>THE PLAN IS A GUIDE, NOT A RULE.</span><Check size={15} /></div>
            </div>
            <div className="atelier-art-foot"><span>MAKE A DAY THAT MAKES SENSE</span><span>FIG. 02</span></div>
          </div>
          <div className="atelier-chapter-copy">
            <p className="atelier-overline"><span /> A RHYTHM THAT IS YOURS</p>
            <h2>The day,<br /><em>composed.</em></h2>
            <p className="atelier-body-copy">A good plan makes space for deep work and the small things that keep a semester moving. See what is coming, decide what matters next, and give each task a place in the day.</p>
            <ul className="atelier-feature-list">
              <li><CalendarDays size={16} /><span>Calendar and deadline tracking</span><ArrowUpRight size={13} /></li>
              <li><Clock3 size={16} /><span>Focus timer and study sessions</span><ArrowUpRight size={13} /></li>
              <li><Sparkles size={16} /><span>Smart study planner and AI guidance</span><ArrowUpRight size={13} /></li>
              <li><GraduationCap size={16} /><span>Study groups and shared momentum</span><ArrowUpRight size={13} /></li>
            </ul>
            <Link href="/signup" className="atelier-text-link">Find your rhythm <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="atelier-chapter atelier-record" id="record">
        <div className="atelier-chapter-heading">
          <span className="atelier-chapter-number">III · THE RECORD</span>
          <span className="atelier-chapter-rule" />
          <span className="atelier-chapter-caption">NOTICE · LEARN · ADJUST</span>
        </div>
        <div className="atelier-chapter-layout">
          <div className="atelier-chapter-copy">
            <p className="atelier-overline"><span /> SEE THE SHAPE OF YOUR WORK</p>
            <h2>What the record<br /><em>reveals.</em></h2>
            <p className="atelier-body-copy">Progress is more than a number. See the work you have completed, the subjects that need attention, and the patterns that help you learn. Let feedback become a next step, not a full stop.</p>
            <ul className="atelier-feature-list">
              <li><Brain size={16} /><span>AI assignment grading and feedback</span><ArrowUpRight size={13} /></li>
              <li><Check size={16} /><span>Quiz results and learning progress</span><ArrowUpRight size={13} /></li>
              <li><GraduationCap size={16} /><span>Grades and GPA tracking</span><ArrowUpRight size={13} /></li>
              <li><Sparkles size={16} /><span>Insights to guide your next session</span><ArrowUpRight size={13} /></li>
            </ul>
            <Link href="/signup" className="atelier-text-link">See your progress <ArrowRight size={15} /></Link>
          </div>
          <div className="atelier-record-art">
            <div className="atelier-art-label">A RECORD OF THE WORK <span>THIS TERM</span></div>
            <div className="atelier-record-paper">
              <div className="atelier-record-head"><span>STUDYSPACE · PRIVATE RECORD</span><span>NO. 001</span></div>
              <h3>Progress,<br /><em>in perspective.</em></h3>
              <div className="atelier-record-metrics">
                <div><span>WORK SESSIONS</span><b>—</b><small>Built as you go</small></div>
                <div><span>COURSES</span><b>—</b><small>All in one place</small></div>
                <div><span>YOUR NEXT STEP</span><b>→</b><small>Always within reach</small></div>
              </div>
              <div className="atelier-record-line"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <p>Your record begins with the work you choose to do.</p>
            </div>
            <div className="atelier-art-foot"><span>THE RECORD IS YOURS</span><span>FIG. 03</span></div>
          </div>
        </div>
      </section>

      <section className="atelier-closing">
        <p className="atelier-overline"><span /> THE DOOR IS OPEN</p>
        <h2>Make room for<br /><em>what matters.</em></h2>
        <p>One place for the whole of your student life. Begin with today; the rest can follow.</p>
        <Link href="/signup" className="atelier-primary">Enter StudySpace <ArrowUpRight size={16} /></Link>
        <span className="atelier-closing-note">A workspace for students. Yours to shape.</span>
      </section>

      <footer className="atelier-footer">
        <Link href="/" className="atelier-wordmark"><StudySpaceMark size={25} animated={false} /><span>STUDYSPACE</span><i>®</i></Link>
        <span>YOUR SEMESTER, IN ITS PLACE.</span>
        <div><Link href="/login">Sign in</Link><Link href="/signup">Create your space <ChevronRight size={13} /></Link></div>
        <small>© {new Date().getFullYear()} StudySpace. Made for the work of becoming.</small>
      </footer>
    </main>
  );
}
