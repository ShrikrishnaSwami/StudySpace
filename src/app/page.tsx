"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Brain, CalendarDays, Check, CheckCircle2, Clock3, FileText, GraduationCap, Layers3, Menu, Search, Sparkles, X } from "lucide-react";

const features = [
  { icon: CalendarDays, title: "Know what is next", text: "Keep deadlines, classes and study blocks in one view.", href: "/calendar" },
  { icon: BookOpen, title: "Keep courses together", text: "Bring course work, notes and useful resources closer.", href: "/courses" },
  { icon: Brain, title: "Get help when stuck", text: "Work through concepts with the AI Tutor, step by step.", href: "/ai-tutor" },
  { icon: CheckCircle2, title: "Learn from feedback", text: "Review assignment results and practical next steps.", href: "/assignments" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [taskDone, setTaskDone] = useState(false);

  return <main id="main-content" className="bento-home">
    <header className="bento-header">
      <Link href="/" className="bento-brand" aria-label="StudySpace home"><span className="bento-brand-mark"><GraduationCap size={20}/></span><span>StudySpace</span></Link>
      <nav className="bento-nav" aria-label="Main navigation"><a href="#workspace">Workspace</a><a href="#features">Features</a><a href="#how-it-works">How it works</a></nav>
      <div className="bento-header-actions"><Link href="/login" className="bento-login">Log in</Link><Link href="/signup" className="bento-button bento-button-small">Create your space <ArrowRight size={16}/></Link></div>
      <button className="bento-menu-button" onClick={() => setMenuOpen(v => !v)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
    </header>
    {menuOpen && <nav className="bento-mobile-nav" aria-label="Mobile navigation"><a href="#workspace" onClick={() => setMenuOpen(false)}>Workspace</a><a href="#features" onClick={() => setMenuOpen(false)}>Features</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link><Link href="/signup" className="bento-button" onClick={() => setMenuOpen(false)}>Create your space <ArrowRight size={16}/></Link></nav>}

    <section className="bento-grid bento-hero-grid" id="workspace" aria-label="StudySpace overview">
      <article className="bento-tile bento-hero-tile bento-span-6 bento-row-2 bento-enter">
        <div className="bento-kicker"><span className="bento-kicker-dot"/> STUDENT LIFE, IN ONE PLACE</div>
        <h1>Your semester.<br/>Less scattered.</h1>
        <p>StudySpace brings courses, assignments, notes, deadlines and AI study tools into one workspace made for students.</p>
        <div className="bento-hero-action"><Link href="/signup" className="bento-button">Create your free account <ArrowRight size={17}/></Link><span>No perfect routine required.</span></div>
      </article>

      <article className="bento-tile bento-preview-tile bento-span-6 bento-enter" style={{animationDelay:"40ms"}}>
        <div className="bento-tile-heading"><div><span className="bento-overline">A LOOK INSIDE</span><h2>Your study workspace</h2></div><span className="bento-window-icon"><Layers3 size={18}/></span></div>
        <div className="bento-app-demo">
          <aside className="bento-demo-sidebar"><div className="bento-demo-brand"><span><GraduationCap size={14}/></span> StudySpace</div><span className="bento-demo-section">WORKSPACE</span><div className="bento-demo-nav active"><Layers3 size={14}/> Overview</div><div className="bento-demo-nav"><BookOpen size={14}/> Courses</div><div className="bento-demo-nav"><CheckCircle2 size={14}/> Assignments</div><div className="bento-demo-nav"><CalendarDays size={14}/> Calendar</div><div className="bento-demo-nav"><Brain size={14}/> AI Tutor</div></aside>
          <div className="bento-demo-content"><div className="bento-demo-top"><span>YOUR OVERVIEW</span><span><Search size={13}/> Search</span></div><h3>Make space to focus.</h3><p>Pick up where you left off.</p>
            <div className="bento-demo-task"><button className={taskDone?"bento-task-check is-done":"bento-task-check"} onClick={() => setTaskDone(v=>!v)} aria-label={taskDone?"Mark review notes incomplete":"Mark review notes complete"}>{taskDone && <Check size={13}/>}</button><span><strong>Review lecture notes</strong><small>Course study task</small></span><span className={taskDone?"bento-task-status is-done":"bento-task-status"}>{taskDone?"DONE":"TO DO"}</span></div>
            <div className="bento-demo-task"><span className="bento-task-check"/><span><strong>Prepare for your quiz</strong><small>Practice and revise</small></span><span className="bento-task-status">NEXT</span></div>
            <div className="bento-demo-footer"><span><Clock3 size={14}/> Your work, organized</span><span>Preview</span></div>
          </div>
        </div>
        <p className="bento-preview-caption">A product preview. Your workspace fills with your courses and work.</p>
      </article>
      <article className="bento-tile bento-dark-tile bento-span-3 bento-enter" style={{animationDelay:"80ms"}}><span className="bento-tile-icon"><CalendarDays size={19}/></span><h2>See the next deadline.</h2><p>Keep upcoming work visible before it becomes urgent.</p><Link href="/calendar" className="bento-tile-link">Open calendar <ArrowUpRight size={15}/></Link></article>
      <article className="bento-tile bento-accent-tile bento-span-3 bento-enter" style={{animationDelay:"120ms"}}><span className="bento-tile-icon"><Brain size={19}/></span><h2>Work through the hard part.</h2><p>Ask the AI Tutor for help understanding a topic.</p><Link href="/ai-tutor" className="bento-tile-link">Open AI Tutor <ArrowUpRight size={15}/></Link></article>
    </section>

    <section className="bento-section" id="features">
      <div className="bento-section-heading"><div><span className="bento-overline">BUILT AROUND YOUR STUDIES</span><h2>Tools that work<br/>better together.</h2></div><p>Go from planning to practice to feedback without keeping student life spread across a dozen places.</p></div>
      <div className="bento-grid bento-feature-grid">
        {features.map(({icon:Icon,title,text,href},index)=><Link href={href} className="bento-tile bento-feature-tile bento-span-3 bento-enter" key={title} style={{animationDelay:`${index*40}ms`}}><span className="bento-tile-icon"><Icon size={19}/></span><h2>{title}</h2><p>{text}</p><span className="bento-tile-link">Explore <ArrowUpRight size={15}/></span></Link>)}
        <article className="bento-tile bento-notes-tile bento-span-6 bento-enter" style={{animationDelay:"160ms"}}><div className="bento-notes-copy"><span className="bento-overline">ONE CONNECTED WORKSPACE</span><h2>Less time searching.<br/>More time learning.</h2><p>Keep notes, quizzes, flashcards, course material and homework tools close to the work they support.</p></div><div className="bento-notes-stack" aria-hidden="true"><div><BookOpen size={18}/><span>Course notes</span><ArrowUpRight size={14}/></div><div><FileText size={18}/><span>Assignments</span><ArrowUpRight size={14}/></div><div><Sparkles size={18}/><span>Study tools</span><ArrowUpRight size={14}/></div></div></article>
        <article className="bento-tile bento-demo-tile bento-span-6 bento-enter" style={{animationDelay:"200ms"}}>
          <span className="bento-overline">A STUDY PROMPT, WHEN YOU NEED IT</span>
          <h2>Make a hard topic easier to approach.</h2>
          <p>Start with a question, ask for a clearer explanation, or work through a concept one step at a time.</p>
          <div className="bento-prompt-example"><Sparkles size={18}/><span>Explain a difficult concept in simpler steps.</span></div>
          <Link href="/ai-tutor" className="bento-button bento-demo-submit">Open AI Tutor <ArrowRight size={16}/></Link>
        </article>port Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Brain, CalendarDays, Check, CheckCircle2, Clock3, FileText, GraduationCap, Layers3, Menu, Search, Sparkles, X } from "lucide-react";

const features = [
  { icon: CalendarDays, title: "Know what is next", text: "Keep deadlines, classes and study blocks in one view.", href: "/calendar" },
  { icon: BookOpen, title: "Keep courses together", text: "Bring course work, notes and useful resources closer.", href: "/courses" },
  { icon: Brain, title: "Get help when stuck", text: "Work through concepts with the AI Tutor, step by step.", href: "/ai-tutor" },
  { icon: CheckCircle2, title: "Learn from feedback", text: "Review assignment results and practical next steps.", href: "/assignments" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [taskDone, setTaskDone] = useState(false);

  return <main id="main-content" className="bento-home">
    <header className="bento-header">
      <Link href="/" className="bento-brand" aria-label="StudySpace home"><span className="bento-brand-mark"><GraduationCap size={20}/></span><span>StudySpace</span></Link>
      <nav className="bento-nav" aria-label="Main navigation"><a href="#workspace">Workspace</a><a href="#features">Features</a><a href="#how-it-works">How it works</a></nav>
      <div className="bento-header-actions"><Link href="/login" className="bento-login">Log in</Link><Link href="/signup" className="bento-button bento-button-small">Create your space <ArrowRight size={16}/></Link></div>
      <button className="bento-menu-button" onClick={() => setMenuOpen(v => !v)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
    </header>
    {menuOpen && <nav className="bento-mobile-nav" aria-label="Mobile navigation"><a href="#workspace" onClick={() => setMenuOpen(false)}>Workspace</a><a href="#features" onClick={() => setMenuOpen(false)}>Features</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link><Link href="/signup" className="bento-button" onClick={() => setMenuOpen(false)}>Create your space <ArrowRight size={16}/></Link></nav>}

    <section className="bento-grid bento-hero-grid" id="workspace" aria-label="StudySpace overview">
      <article className="bento-tile bento-hero-tile bento-span-6 bento-row-2 bento-enter">
        <div className="bento-kicker"><span className="bento-kicker-dot"/> STUDENT LIFE, IN ONE PLACE</div>
        <h1>Your semester.<br/>Less scattered.</h1>
        <p>StudySpace brings courses, assignments, notes, deadlines and AI study tools into one workspace made for students.</p>
        <div className="bento-hero-action"><Link href="/signup" className="bento-button">Create your free account <ArrowRight size={17}/></Link><span>No perfect routine required.</span></div>
      </article>

      <article className="bento-tile bento-preview-tile bento-span-6 bento-enter" style={{animationDelay:"40ms"}}>
        <div className="bento-tile-heading"><div><span className="bento-overline">A LOOK INSIDE</span><h2>Your study workspace</h2></div><span className="bento-window-icon"><Layers3 size={18}/></span></div>
        <div className="bento-app-demo">
          <aside className="bento-demo-sidebar"><div className="bento-demo-brand"><span><GraduationCap size={14}/></span> StudySpace</div><span className="bento-demo-section">WORKSPACE</span><div className="bento-demo-nav active"><Layers3 size={14}/> Overview</div><div className="bento-demo-nav"><BookOpen size={14}/> Courses</div><div className="bento-demo-nav"><CheckCircle2 size={14}/> Assignments</div><div className="bento-demo-nav"><CalendarDays size={14}/> Calendar</div><div className="bento-demo-nav"><Brain size={14}/> AI Tutor</div></aside>
          <div className="bento-demo-content"><div className="bento-demo-top"><span>YOUR OVERVIEW</span><span><Search size={13}/> Search</span></div><h3>Make space to focus.</h3><p>Pick up where you left off.</p>
            <div className="bento-demo-task"><button className={taskDone?"bento-task-check is-done":"bento-task-check"} onClick={() => setTaskDone(v=>!v)} aria-label={taskDone?"Mark review notes incomplete":"Mark review notes complete"}>{taskDone && <Check size={13}/>}</button><span><strong>Review lecture notes</strong><small>Course study task</small></span><span className={taskDone?"bento-task-status is-done":"bento-task-status"}>{taskDone?"DONE":"TO DO"}</span></div>
            <div className="bento-demo-task"><span className="bento-task-check"/><span><strong>Prepare for your quiz</strong><small>Practice and revise</small></span><span className="bento-task-status">NEXT</span></div>
            <div className="bento-demo-footer"><span><Clock3 size={14}/> Your work, organized</span><span>Preview</span></div>
          </div>
        </div>
        <p className="bento-preview-caption">A product preview. Your workspace fills with your courses and work.</p>
      </article>
      <article className="bento-tile bento-dark-tile bento-span-3 bento-enter" style={{animationDelay:"80ms"}}><span className="bento-tile-icon"><CalendarDays size={19}/></span><h2>See the next deadline.</h2><p>Keep upcoming work visible before it becomes urgent.</p><Link href="/calendar" className="bento-tile-link">Open calendar <ArrowUpRight size={15}/></Link></article>
      <article className="bento-tile bento-accent-tile bento-span-3 bento-enter" style={{animationDelay:"120ms"}}><span className="bento-tile-icon"><Brain size={19}/></span><h2>Work through the hard part.</h2><p>Ask the AI Tutor for help understanding a topic.</p><Link href="/ai-tutor" className="bento-tile-link">Open AI Tutor <ArrowUpRight size={15}/></Link></article>
    </section>

    <section className="bento-section" id="features">
      <div className="bento-section-heading"><div><span className="bento-overline">BUILT AROUND YOUR STUDIES</span><h2>Tools that work<br/>better together.</h2></div><p>Go from planning to practice to feedback without keeping student life spread across a dozen places.</p></div>
      <div className="bento-grid bento-feature-grid">
        {features.map(({icon:Icon,title,text,href},index)=><Link href={href} className="bento-tile bento-feature-tile bento-span-3 bento-enter" key={title} style={{animationDelay:`${index*40}ms`}}><span className="bento-tile-icon"><Icon size={19}/></span><h2>{title}</h2><p>{text}</p><span className="bento-tile-link">Explore <ArrowUpRight size={15}/></span></Link>)}
        <article className="bento-tile bento-notes-tile bento-span-6 bento-enter" style={{animationDelay:"160ms"}}><div className="bento-notes-copy"><span className="bento-overline">ONE CONNECTED WORKSPACE</span><h2>Less time searching.<br/>More time learning.</h2><p>Keep notes, quizzes, flashcards, course material and homework tools close to the work they support.</p></div><div className="bento-notes-stack" aria-hidden="true"><div><BookOpen size={18}/><span>Course notes</span><ArrowUpRight size={14}/></div><div><FileText size={18}/><span>Assignments</span><ArrowUpRight size={14}/></div><div><Sparkles size={18}/><span>Study tools</span><ArrowUpRight size={14}/></div></div></article>
        <article className="bento-tile bento-demo-tile bento-span-6 bento-enter" style={{animationDelay:"200ms"}}><span className="bento-overline">TRY A SMALL DEMO</span><h2>Start with a question.</h2><p>Preview a study prompt. Sign in to use your connected AI study tools.</p><label className="bento-demo-label" htmlFor="study-prompt">Your study prompt</label><textarea id="study-prompt" value={prompt} onChange={event=>{setPrompt(event.target.value);setPreviewOpen(false);}} maxLength={180}/><button className="bento-button bento-demo-submit" onClick={()=>setPreviewOpen(true)} disabled={!prompt.trim()}>Preview prompt <ArrowRight size={16}/></button>{previewOpen && <p className="bento-demo-response" role="status">Ready to study: “{prompt.trim()}” — create an account to continue in your workspace.</p>}</article>
      </div>
    </section>

    <section className="bento-section bento-how-section" id="how-it-works"><div className="bento-section-heading"><div><span className="bento-overline">GETTING STARTED</span><h2>Begin with what<br/>you need today.</h2></div><p>Set up your space gradually. You do not need a perfect system before you start.</p></div>
      <div className="bento-grid bento-steps-grid"><article className="bento-tile bento-step-tile bento-span-4"><span className="bento-step-number">01</span><h2>Add your courses.</h2><p>Bring your current classes and materials together.</p></article><article className="bento-tile bento-step-tile bento-span-4"><span className="bento-step-number">02</span><h2>Plan the work.</h2><p>Track assignments and upcoming deadlines.</p></article><article className="bento-tile bento-step-tile bento-span-4"><span className="bento-step-number">03</span><h2>Study and improve.</h2><p>Practice with study tools and use feedback to choose your next step.</p></article></div>
    </section>

    <section className="bento-grid bento-final-grid"><article className="bento-tile bento-final-tile bento-span-8"><span className="bento-overline">YOUR NEXT STEP</span><h2>Give your semester<br/>one place to land.</h2><p>Create an account and start organizing the work in front of you.</p><Link href="/signup" className="bento-button">Create your account <ArrowRight size={17}/></Link></article><article className="bento-tile bento-contact-tile bento-span-4"><span className="bento-tile-icon"><FileText size={19}/></span><h2>Questions or feedback?</h2><p>StudySpace is in a controlled beta. Your feedback helps shape what comes next.</p><a href="https://github.com/ShrikrishnaSwami/StudySpace/issues" target="_blank" rel="noreferrer" className="bento-tile-link">Share feedback on GitHub <ArrowUpRight size={15}/></a></article></section>
    <footer className="bento-footer"><Link href="/" className="bento-brand"><span className="bento-brand-mark"><GraduationCap size={20}/></span><span>StudySpace</span></Link><span>Courses, deadlines and study tools in one workspace.</span><div><Link href="/login">Log in</Link><Link href="/signup">Create account</Link><a href="https://github.com/ShrikrishnaSwami/StudySpace/issues" target="_blank" rel="noreferrer">Feedback</a></div><small>© {new Date().getFullYear()} StudySpace</small></footer>
  </main>;
}
