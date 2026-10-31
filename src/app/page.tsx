"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, CalendarDays,
  Check, FileText, Menu, X, Clock3, Layers3, NotebookPen,
} from "lucide-react";
import StudySpaceMark from "@/components/StudySpaceMark";

const chapters = [
  { id: "courses", number: "01", title: "Turn the syllabus into a plan", copy: "Drop in the PDF. Pull out deadlines, quizzes and exams before they sneak up on you.", icon: BookOpen, label: "COURSE TIMELINE", preview: ["BIO 213 · COURSE PLAN", "Lab report · due Friday", "Tutorial quiz · tomorrow", "Midterm · November 12"] },
  { id: "tutor", number: "02", title: "Get unstuck without the tab spiral", copy: "Ask your AI study partner to explain the hard bit using the material from your course.", icon: BrainCircuit, label: "STUDY SESSION", preview: ["ECON 101 · MIDTERM CRAM", "Supply and demand · review", "Elasticity · 3 questions left", "Explain the graph one more time."] },
  { id: "work", number: "03", title: "Know what needs doing next", copy: "Keep assignments, submissions and practice work visible before a small task becomes a 2 a.m. emergency.", icon: FileText, label: "WORK QUEUE", preview: ["UP NEXT", "Organic Chem II · 24 flashcards", "Econ 101 · midterm cram session", "BIO 213 · lab report due Friday"] },
  { id: "time", number: "04", title: "See the week before it gets messy", copy: "Put classes, deadlines and study sessions on one timeline. Your future self says thanks.", icon: CalendarDays, label: "THIS WEEK", preview: ["MON · Organic Chem flashcards", "TUE · Econ study group", "THU · Biology lab report", "FRI · Midterm review session"] },
];

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [activeChapter, setActiveChapter] = useState("courses");
  const [chapterPaused, setChapterPaused] = useState(false);
  const active = chapters.find((item) => item.id === activeChapter) ?? chapters[0];
  useEffect(() => {
    if (chapterPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const chapterIds = chapters.map((chapter) => chapter.id);
    const cycle = window.setInterval(() => {
      setActiveChapter((current) => {
        const currentIndex = chapterIds.indexOf(current);
        return chapterIds[(currentIndex + 1) % chapterIds.length];
      });
    }, 3600);
    return () => window.clearInterval(cycle);
  }, [chapterPaused]);
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
          <p className="ss-editorial-kicker"><span/> MADE BY A STUDENT, FOR STUDENT WORK</p>
          <h1 aria-label="The second brain for students running 40 open tabs."><span className="ss-word" aria-hidden="true">Your</span>{" "}<span className="ss-word" aria-hidden="true">second</span><br/><span className="ss-word" aria-hidden="true">brain for</span>{" "}<span className="ss-word" aria-hidden="true">student</span><br/><em><span className="ss-word" aria-hidden="true">life.</span></em></h1>
          <p className="ss-editorial-deck">The second brain for students running 40 open tabs. Keep courses, notes, deadlines and study tools together — then get back to cramming, keeping track, and surviving midterms.</p>
          <div className="ss-editorial-actions"><Link href="/signup" className="ss-landing-primary">Create your StudySpace <ArrowUpRight size={17}/></Link><Link href="/login" className="ss-editorial-text-link">Already have an account? Sign in</Link></div>
        </div>
        <aside className="ss-editorial-specimen" data-motion-card data-motion-parallax aria-label="A glimpse of the StudySpace workspace">
          <div className="ss-specimen-top"><span>YOUR DASHBOARD / RIGHT NOW</span><span>01—04</span></div>
          <div className="ss-specimen-date"><span>YOUR</span><strong>WEEK</strong><small>AT A GLANCE</small></div>
          <div className="ss-specimen-rule"/>
          <p className="ss-specimen-label">WHAT NEEDS DOING</p>
          <div className="ss-specimen-task"><span className="ss-specimen-marker" data-live-pulse/><div><b>Organic Chem II flashcards</b><small>CHEM · 24 cards ready to review</small></div><span>01</span></div>
          <div className="ss-specimen-task"><span className="ss-specimen-marker"/><div><b>Econ 101 midterm cram</b><small>ECON · 3 topics left to review</small></div><span>02</span></div>
          <div className="ss-specimen-task is-muted"><span className="ss-specimen-marker"/><div><b>BIO 213 lab report</b><small>BIO · Due Friday</small></div><span>03</span></div>
          <div className="ss-specimen-foot"><span>A FEW THINGS ON YOUR LIST</span><Clock3 size={13}/></div>
          <div className="ss-specimen-note"><NotebookPen size={15}/><span>Notes, deadlines and questions stay with your courses.</span></div>
        </aside>
        <div className="ss-editorial-margin-note">COURSES, NOTES AND STUDY TOOLS<br/>IN ONE PLACE</div>
        <div className="ss-editorial-bottomline"><span>BUILT AROUND YOUR COURSES</span><span>SCROLL TO SEE WHAT IS INCLUDED ↓</span></div>
      </section>

      <section className="ss-editorial-manifesto" id="about">
        <p className="ss-editorial-kicker">SCHOOL ALREADY HAS ENOUGH MOVING PARTS</p>
        <div className="ss-editorial-manifesto-grid"><h2>Forty tabs open.<br/><em>One place to land.</em></h2><div><p>Lecture slides in one folder. The syllabus in your inbox. Flashcards in another app. A deadline buried in the course portal. You know the drill.</p><p>StudySpace pulls the moving parts into one workspace, so you spend less time hunting for what to do and more time actually doing it.</p></div></div>
      </section>

      <section className="ss-editorial-workspace" id="workspace">
        <div className="ss-editorial-section-head"><p className="ss-editorial-kicker">WHAT&apos;S ACTUALLY IN THE APP</p><span>01 — 04 / EXPLORE THE DESK</span></div>
        <div className="ss-editorial-workspace-layout">
          <div className="ss-editorial-chapters" role="group" aria-label="Explore StudySpace features" onPointerEnter={() => setChapterPaused(true)} onPointerLeave={() => setChapterPaused(false)} onFocusCapture={() => setChapterPaused(true)} onBlurCapture={() => setChapterPaused(false)}>
            {chapters.map((chapter) => { const Icon = chapter.icon; const selected = activeChapter === chapter.id; return <button key={chapter.id} type="button" aria-pressed={selected} aria-controls="ss-feature-preview" onMouseEnter={() => setActiveChapter(chapter.id)} onFocus={() => setActiveChapter(chapter.id)} onClick={() => setActiveChapter(chapter.id)} className={selected ? "is-active" : ""}><span className="ss-chapter-number">{chapter.number}</span><span className="ss-chapter-copy"><b>{chapter.title}</b><small>{chapter.copy}</small></span><Icon className="ss-chapter-icon" size={18}/><ArrowUpRight className="ss-chapter-arrow" size={16}/></button>; })}
          </div>
          <div className="ss-editorial-preview-wrap">
            <div className="ss-editorial-preview" data-motion-card id="ss-feature-preview" role="tabpanel" aria-label={active.title}>
              <div className="ss-preview-windowbar"><span/><span/><span/><small>STUDYSPACE / {active.label}</small></div>
              <div className="ss-preview-content"><div className="ss-preview-heading"><span>{active.number} / {active.label}</span><PreviewIcon size={19}/></div><h3>{active.title}</h3><p>{active.copy}</p><div className="ss-preview-paper">{active.preview.map((line, index) => <div key={line} className={index === 0 ? "ss-preview-paper-title" : ""}><span>{index === 0 ? "—" : "0" + (index + 1)}</span>{line}{index === 0 ? <Check size={13}/> : null}</div>)}</div><span className="ss-preview-caption">A QUICK LOOK AT YOUR WORKSPACE</span></div>
            </div>
            <p className="ss-editorial-preview-note">The details change with the way you study. The work stays yours.</p>
          </div>
        </div>
      </section>

      <section className="ss-editorial-method" id="method">
        <div className="ss-method-number">02</div>
        <div className="ss-method-main"><p className="ss-editorial-kicker">SET UP THE COURSES YOU&apos;RE TAKING</p><h2>Add your courses.<br/><em>Bring in the syllabus.</em></h2><p>Add a course, upload its syllabus, and save the notes and files you already have. StudySpace can pull dates out of a PDF so you don&apos;t have to enter every deadline by hand.</p><Link href="/signup" className="ss-inline-link">Get started <ArrowUpRight size={15}/></Link></div>
        <div className="ss-method-aside"><div><Layers3 size={17}/><span>COURSES</span><b>Keep slides, notes and readings together</b></div><div><BrainCircuit size={17}/><span>STUDY</span><b>Make flashcards and ask questions</b></div><div><CalendarDays size={17}/><span>PLAN</span><b>See classes and due dates</b></div></div>
      </section>

      <section className="ss-editorial-closing"><p className="ss-editorial-kicker">WHEN YOU WANT TO TRY IT</p><h2>Put your course stuff<br/><em>in one place.</em></h2><p>Create an account, add a course, and start with whatever is due next.</p><Link href="/signup" className="ss-landing-primary">Create your space <ArrowUpRight size={17}/></Link><div className="ss-final-existing">Already using StudySpace? <Link href="/login">Sign in <ArrowRight size={13}/></Link></div></section>
      <footer className="ss-landing-footer"><Link href="/" className="ss-landing-brand"><StudySpaceMark size={28}/><span>STUDYSPACE</span></Link><span className="ss-editorial-footer-note">MADE FOR REAL STUDENT WORK.</span><div><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link></div><small>© {new Date().getFullYear()} StudySpace</small></footer>
    </main>
  );
}
