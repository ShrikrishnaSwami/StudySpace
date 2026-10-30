"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, CalendarDays,
  Check, FileText, Menu, X, Clock3, Layers3, NotebookPen,
} from "lucide-react";
import StudySpaceMark from "@/components/StudySpaceMark";

const chapters = [
  { id: "courses", number: "01", title: "Keep every course straight", copy: "Syllabi, lecture notes, readings and resources belong with the class they came from.", icon: BookOpen, label: "COURSE FILE", preview: ["BIO 213 · Cell Biology", "Week 04 — Cell signalling", "Lecture notes · 12 pages", "Lab reading · Due Friday"] },
  { id: "tutor", number: "02", title: "Ask better questions", copy: "Work through a difficult idea with an AI tutor that can use the material you study from.", icon: BrainCircuit, label: "TUTOR SESSION", preview: ["AI TUTOR · BIO 213", "Explain the difference between", "competitive and non-competitive", "enzyme inhibition, with examples."] },
  { id: "work", number: "03", title: "Know what still needs doing", copy: "Assignments, practice quizzes and flashcards live beside the courses they belong to.", icon: FileText, label: "WORK QUEUE", preview: ["UP NEXT", "Research response · Thursday", "Chapter 6 quiz · Friday", "Lab report · Monday"] },
  { id: "time", number: "04", title: "See the week before it gets away", copy: "Put lectures, deadlines and study sessions on one calendar you can actually read.", icon: CalendarDays, label: "THIS WEEK", preview: ["MON · Lecture 10:00", "TUE · Study group 14:30", "THU · Research response", "FRI · Chapter 6 quiz"] },
];

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [activeChapter, setActiveChapter] = useState("courses");
  const active = chapters.find((item) => item.id === activeChapter) ?? chapters[0];
  const PreviewIcon = active.icon;

  return (
    <main className="ss-landing ss-editorial">
      <header className="ss-landing-nav">
        <Link href="/" className="ss-landing-brand"><StudySpaceMark size={32}/><span>STUDYSPACE</span></Link>
        <nav className="ss-landing-links" aria-label="Main navigation"><a href="#workspace">The workspace</a><a href="#method">How it works</a><a href="#about">About</a></nav>
        <div className="ss-landing-actions"><Link href="/login" className="ss-landing-enter">Sign in <ArrowUpRight size={14}/></Link><Link href="/signup" className="ss-landing-signup">Create an account <ArrowRight size={14}/></Link></div>
        <button className="ss-landing-menu" onClick={() => setMenu((value) => !value)} aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu}>{menu ? <X/> : <Menu/>}</button>
      </header>
      {menu && <nav className="ss-landing-mobile" aria-label="Mobile navigation"><a href="#workspace" onClick={() => setMenu(false)}>The workspace</a><a href="#method" onClick={() => setMenu(false)}>How it works</a><a href="#about" onClick={() => setMenu(false)}>About</a><Link href="/login" onClick={() => setMenu(false)}>Sign in</Link><Link href="/signup" onClick={() => setMenu(false)}>Create an account <ArrowRight size={15}/></Link></nav>}

      <section className="ss-editorial-opening">
        <div className="ss-editorial-opening-copy">
          <p className="ss-editorial-kicker"><span/> MADE FOR THE ACTUAL BUSINESS OF BEING A STUDENT</p>
          <h1>Too many tabs.<br/><em>Not enough</em><br/>time to study.</h1>
          <p className="ss-editorial-deck">Your courses, notes, assignments and study tools keep ending up in different places. StudySpace brings the work back together.</p>
          <div className="ss-editorial-actions"><Link href="/signup" className="ss-landing-primary">Make your space <ArrowUpRight size={17}/></Link><Link href="/login" className="ss-editorial-text-link">Already have an account? Sign in</Link></div>
        </div>
        <aside className="ss-editorial-specimen" aria-label="A glimpse of the StudySpace workspace">
          <div className="ss-specimen-top"><span>YOUR DESK / MONDAY</span><span>01—04</span></div>
          <div className="ss-specimen-date"><span>OCT</span><strong>29</strong><small>WEDNESDAY</small></div>
          <div className="ss-specimen-rule"/>
          <p className="ss-specimen-label">ON THE DESK TODAY</p>
          <div className="ss-specimen-task"><span className="ss-specimen-marker"/><div><b>Finish biology notes</b><small>BIO 213 · 25 min</small></div><span>01</span></div>
          <div className="ss-specimen-task"><span className="ss-specimen-marker"/><div><b>Review lecture questions</b><small>PSY 110 · 15 min</small></div><span>02</span></div>
          <div className="ss-specimen-task is-muted"><span className="ss-specimen-marker"/><div><b>Plan the lab report</b><small>CHEM 101 · Tomorrow</small></div><span>03</span></div>
          <div className="ss-specimen-foot"><span>THREE THINGS TO START WITH</span><Clock3 size={13}/></div>
          <div className="ss-specimen-note"><NotebookPen size={15}/><span>Lecture notes, finally where you left them.</span></div>
        </aside>
        <div className="ss-editorial-margin-note">A STUDENT WORKSPACE<br/>NOT ANOTHER TO-DO APP</div>
        <div className="ss-editorial-bottomline"><span>BUILT AROUND YOUR COURSES</span><span>ONE PLACE TO PICK UP WHERE YOU LEFT OFF ↓</span></div>
      </section>

      <section className="ss-editorial-manifesto" id="about">
        <p className="ss-editorial-kicker">THE PROBLEM ISN'T YOU</p>
        <div className="ss-editorial-manifesto-grid"><h2>Studying is hard enough.<br/><em>Finding your stuff shouldn't be.</em></h2><div><p>The lecture is in one app. The assignment is in another. Your notes are somewhere in a downloads folder. And the deadline? You meant to check that.</p><p>StudySpace gives the pieces a shared home, without pretending the work itself is easy.</p></div></div>
      </section>

      <section className="ss-editorial-workspace" id="workspace">
        <div className="ss-editorial-section-head"><p className="ss-editorial-kicker">A PLACE FOR EACH PART OF THE WORK</p><span>01 — 04 / EXPLORE THE DESK</span></div>
        <div className="ss-editorial-workspace-layout">
          <div className="ss-editorial-chapters" role="tablist" aria-label="StudySpace features">
            {chapters.map((chapter) => { const Icon = chapter.icon; const selected = activeChapter === chapter.id; return <button key={chapter.id} type="button" role="tab" aria-selected={selected} aria-controls="ss-feature-preview" onMouseEnter={() => setActiveChapter(chapter.id)} onFocus={() => setActiveChapter(chapter.id)} onClick={() => setActiveChapter(chapter.id)} className={selected ? "is-active" : ""}><span className="ss-chapter-number">{chapter.number}</span><span className="ss-chapter-copy"><b>{chapter.title}</b><small>{chapter.copy}</small></span><Icon className="ss-chapter-icon" size={18}/><ArrowUpRight className="ss-chapter-arrow" size={16}/></button>; })}
          </div>
          <div className="ss-editorial-preview-wrap">
            <div className="ss-editorial-preview" id="ss-feature-preview" role="tabpanel" aria-label={active.title}>
              <div className="ss-preview-windowbar"><span/><span/><span/><small>STUDYSPACE / {active.label}</small></div>
              <div className="ss-preview-content"><div className="ss-preview-heading"><span>{active.number} / {active.label}</span><PreviewIcon size={19}/></div><h3>{active.title}</h3><p>{active.copy}</p><div className="ss-preview-paper">{active.preview.map((line, index) => <div key={line} className={index === 0 ? "ss-preview-paper-title" : ""}><span>{index === 0 ? "—" : "0" + (index + 1)}</span>{line}{index === 0 ? <Check size={13}/> : null}</div>)}</div><span className="ss-preview-caption">A QUICK LOOK AT YOUR WORKSPACE</span></div>
            </div>
            <p className="ss-editorial-preview-note">The details change with the way you study. The work stays yours.</p>
          </div>
        </div>
      </section>

      <section className="ss-editorial-method" id="method">
        <div className="ss-method-number">02</div>
        <div className="ss-method-main"><p className="ss-editorial-kicker">START WITH WHAT YOU ALREADY HAVE</p><h2>Add your courses.<br/><em>Bring your work along.</em></h2><p>Set up your courses, add notes and deadlines, then use the tools when you need them. Your workspace grows around the semester you are actually taking.</p><Link href="/signup" className="ss-inline-link">Get started <ArrowUpRight size={15}/></Link></div>
        <div className="ss-method-aside"><div><Layers3 size={17}/><span>COURSES</span><b>Organize the material</b></div><div><BrainCircuit size={17}/><span>STUDY</span><b>Ask, practise, understand</b></div><div><CalendarDays size={17}/><span>PLAN</span><b>Keep an eye on what's next</b></div></div>
      </section>

      <section className="ss-editorial-closing"><p className="ss-editorial-kicker">WHEN YOU'RE READY</p><h2>Get back to<br/><em>the actual studying.</em></h2><p>No perfect routine required. Just a place to start.</p><Link href="/signup" className="ss-landing-primary">Create your space <ArrowUpRight size={17}/></Link><div className="ss-final-existing">Already using StudySpace? <Link href="/login">Sign in <ArrowRight size={13}/></Link></div></section>
      <footer className="ss-landing-footer"><Link href="/" className="ss-landing-brand"><StudySpaceMark size={28}/><span>STUDYSPACE</span></Link><span className="ss-editorial-footer-note">A LITTLE MORE ROOM TO THINK.</span><div><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link></div><small>© {new Date().getFullYear()} StudySpace</small></footer>
    </main>
  );
}
