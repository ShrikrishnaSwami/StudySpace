"use client";

import Link from "next/link";
import StudySpaceMark from "@/components/StudySpaceMark";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Brain, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, FileText, GraduationCap, Layers3, Menu, Sparkles, Target, X, Zap } from "lucide-react";

const navItems=[{label:"Workspace",href:"#workspace"},{label:"Features",href:"#features"},{label:"How it works",href:"#how-it-works"}];
const features=[
 {icon:CalendarDays,title:"Everything on the calendar",text:"See deadlines, classes and study blocks before they sneak up on you.",href:"/calendar",tone:"violet"},
 {icon:BookOpen,title:"Your courses, together",text:"Keep notes, assignments and useful resources connected to each class.",href:"/courses",tone:"blue"},
 {icon:Brain,title:"An AI study partner",text:"Get unstuck, practise a concept or break a big topic into smaller steps.",href:"/ai-tutor",tone:"pink"},
 {icon:Target,title:"AI grading that teaches",text:"Submit your work and get a score, clear feedback, and practical next steps.",href:"/assignments",tone:"orange"},
];

export default function Home(){
 const [menuOpen,setMenuOpen]=useState(false);
 return <main id="main-content" className="fr-home">
  <div className="fr-ambient" aria-hidden="true"/>
  <header className="fr-nav-wrap"><nav className="fr-nav" aria-label="Main navigation">
   <Link href="/" className="fr-brand"><StudySpaceMark size={36} className="fr-brand-mark" /><span>studyspace<span className="fr-brand-period">.</span></span></Link>
   <div className="fr-nav-links">{navItems.map(item=><a key={item.href} href={item.href}>{item.label}</a>)}</div>
   <div className="fr-nav-actions"><Link href="/login" className="fr-login">Log in</Link><Link href="/signup" className="fr-button fr-button-small">Get started <ArrowUpRight size={15}/></Link></div>
   <button className="fr-menu-toggle" type="button" aria-label={menuOpen?"Close menu":"Open menu"} aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X size={20}/>:<Menu size={20}/>}</button>
  </nav>{menuOpen&&<div className="fr-mobile-menu">{navItems.map(item=><a key={item.href} href={item.href} onClick={()=>setMenuOpen(false)}>{item.label}<ArrowUpRight size={15}/></a>)}<Link href="/login" onClick={()=>setMenuOpen(false)}>Log in</Link><Link href="/signup" className="fr-mobile-cta" onClick={()=>setMenuOpen(false)}>Get started <ArrowRight size={16}/></Link></div>}</header>

  <section className="fr-hero">
   <div className="fr-hero-copy"><a href="#workspace" className="fr-announcement"><span className="fr-live-dot"/><span>A calmer way to do student life</span><span className="fr-announcement-arrow"><ArrowUpRight size={13}/></span></a>
    <h1>Your semester,<br/>finally <span>in sync.</span></h1>
    <p className="fr-hero-description">One workspace for classes, assignments, notes, and AI-powered grading. Get clear feedback on your work and spend less time keeping track of everything.</p>
    <div className="fr-hero-actions"><Link href="/signup" className="fr-button">Build your workspace <ArrowRight size={17}/></Link><Link href="/login" className="fr-secondary-link">I already have an account <ChevronRight size={16}/></Link></div>
    <div className="fr-trust-row"><div className="fr-avatar-stack"><span>S</span><span>✳</span><span>↗</span></div><div><strong>Made for real student days.</strong><small>Start free. Make it yours as you go.</small></div></div>
   </div>

   <div className="fr-product-stage" id="workspace" aria-label="Preview of the StudySpace student dashboard"><div className="fr-stage-orbit fr-stage-orbit-one"/><div className="fr-stage-orbit fr-stage-orbit-two"/>
    <div className="fr-product-window"><div className="fr-window-top"><div className="fr-window-dots"><i/><i/><i/></div><div className="fr-window-address"><span/> app.studyspace</div><div className="fr-window-top-right"><span/><span/><span/></div></div>
     <div className="fr-app-preview"><aside className="fr-preview-sidebar">
      <div className="fr-preview-logo"><StudySpaceMark size={24} animated={false} /> StudySpace</div><div className="fr-preview-label">WORKSPACE</div>
      <div className="fr-preview-nav active"><Layers3 size={13}/> Overview</div><div className="fr-preview-nav"><BookOpen size={13}/> My courses</div><div className="fr-preview-nav"><CheckCircle2 size={13}/> Assignments</div><div className="fr-preview-nav"><CalendarDays size={13}/> Calendar</div><div className="fr-preview-nav"><Brain size={13}/> AI study room</div>
      <div className="fr-preview-sidebar-bottom"><span className="fr-preview-avatar">S</span><span>My workspace<small>Personal space</small></span><ChevronRight size={12}/></div>
     </aside>
     <div className="fr-preview-main"><div className="fr-preview-topline"><span>MONDAY, OCTOBER 26</span><div className="fr-preview-top-actions"><span className="fr-preview-search">⌕ <small>Search anything</small></span><span className="fr-preview-bell">♧</span></div></div>
      <div className="fr-preview-heading"><div><p>YOUR OVERVIEW</p><h2>Hey there, you’ve got this.</h2><span>Here’s your day, at a glance.</span></div><div className="fr-preview-day">MON <b>26</b></div></div>
      <div className="fr-preview-stats"><div><span>UP NEXT</span><b>03 <small>tasks</small></b><i className="fr-stat-violet"><Check size={12}/></i></div><div><span>THIS WEEK</span><b>72<small>%</small></b><div className="fr-mini-progress"><i/></div></div><div><span>STUDY TIME</span><b>2.5<small> hrs</small></b><i className="fr-stat-blue"><Clock3 size={12}/></i></div></div>
      <div className="fr-preview-lower"><div className="fr-preview-tasks"><div className="fr-preview-section-head"><b>On your plate</b><span>View all ↗</span></div>
       <div className="fr-preview-task"><span className="fr-task-check checked"><Check size={10}/></span><span><b>Read chapter 4</b><small>Psychology · 20 min</small></span><em>DONE</em></div>
       <div className="fr-preview-task"><span className="fr-task-check"/><span><b>Calculus problem set</b><small>Math 101 · Due tomorrow</small></span><em className="task-soon">SOON</em></div>
       <div className="fr-preview-task"><span className="fr-task-check"/><span><b>Review lecture notes</b><small>Biology · 30 min</small></span></div>
      </div><div className="fr-preview-ai"><div className="fr-ai-icon"><Sparkles size={14}/></div><span className="fr-ai-label">YOUR AI INSTRUCTOR</span><b>Learn from every result.</b><p>Get a score, useful feedback, and clear next steps on submitted work.</p><div className="fr-ai-prompt">Review my feedback <ArrowRight size={11}/></div></div></div>
     </div></div>
    </div>
    <div className="fr-float-card fr-float-top"><span className="fr-float-check"><Check size={13}/></span><span><b>One less thing to remember</b><small>Assignment marked complete</small></span></div>
    <div className="fr-float-card fr-float-bottom"><span className="fr-float-spark"><Sparkles size={15}/></span><span><b>A little momentum</b><small>3 tasks moved forward today</small></span><span className="fr-float-up">↗</span></div>
   </div>
   <div className="fr-hero-footnote"><span>01 / A LITTLE MORE CLARITY</span><span>MADE FOR THE WAY STUDENTS ACTUALLY WORK <ArrowUpRight size={13}/></span></div>
  </section>

  <section className="fr-logo-strip" aria-label="StudySpace tools"><span>ONE HOME FOR YOUR</span><b><CalendarDays size={16}/> Deadlines</b><i/><b><BookOpen size={16}/> Courses</b><i/><b><Brain size={16}/> AI study tools</b><i/><b><FileText size={16}/> Notes</b><i/><b><Zap size={16}/> Practice</b></section>
  <section className="fr-features" id="features"><div className="fr-section-intro"><div><span className="fr-eyebrow"><span/> EVERYTHING CONNECTED</span><h2>All the moving parts.<br/><span>One clear picture.</span></h2></div><p>Not another productivity system to maintain. Just the tools you need, connected in a way that makes the next step easier to see.</p></div>
   <div className="fr-feature-grid">{features.map(({icon:Icon,title,text,href,tone},index)=><Link href={href} key={title} className={`fr-feature-card fr-feature-${tone}`}>
    <div className="fr-feature-card-top"><span>0{index+1} / STUDYSPACE</span><span className="fr-feature-icon"><Icon size={20}/></span></div>
    <div className="fr-feature-illustration" aria-hidden="true">{index===0?<div className="fr-illustration-calendar"><span>MON</span><b>26</b><i/><i/><i/></div>:index===1?<div className="fr-illustration-books"><span><BookOpen size={22}/></span><span><FileText size={22}/></span><span><Layers3 size={22}/></span></div>:index===2?<div className="fr-illustration-ai"><Sparkles size={25}/><span>Explain it another way...</span><ArrowRight size={14}/></div>:<div className="fr-illustration-progress"><span>THIS WEEK</span><b>72%</b><i><em/></i><small>You’re finding your rhythm.</small></div>}</div>
    <h3>{title}</h3><p>{text}</p><span className="fr-feature-link">Explore feature <ArrowUpRight size={15}/></span>
   </Link>)}</div>
  </section>
  <section className="fr-how" id="how-it-works"><div className="fr-how-heading"><span className="fr-eyebrow"><span/> A BETTER WAY TO GET STARTED</span><h2>Less setup.<br/><span>More getting somewhere.</span></h2><p>Start with what you have. Build the rest as your semester unfolds.</p></div>
   <div className="fr-steps"><article><span className="fr-step-number">01</span><div className="fr-step-icon"><GraduationCap size={20}/></div><h3>Bring your classes in</h3><p>Set up your courses and gather the work that usually ends up scattered across tabs.</p></article><article><span className="fr-step-number">02</span><div className="fr-step-icon"><CalendarDays size={20}/></div><h3>See what’s coming</h3><p>Assignments and plans become easier to manage when they live in the same place.</p></article><article><span className="fr-step-number">03</span><div className="fr-step-icon"><Sparkles size={20}/></div><h3>Keep moving forward</h3><p>Use study tools when you need them, notice your progress and adjust as you go.</p></article></div>
  </section>
  <section className="fr-bottom-cta"><div className="fr-cta-glow" aria-hidden="true"/><span className="fr-eyebrow"><span/> YOUR SPACE IS WAITING</span><h2>Make room for<br/><span>what matters.</span></h2><p>Give your student life one less thing to fight with.</p><Link href="/signup" className="fr-button fr-button-light">Get started for free <ArrowRight size={17}/></Link><small>No perfect routine required.</small></section>
  <footer className="fr-footer"><Link href="/" className="fr-brand"><span className="fr-brand-mark"><GraduationCap size={19}/></span><span>studyspace<span className="fr-brand-period">.</span></span></Link><span>YOUR SEMESTER, A LITTLE MORE IN SYNC.</span><div><Link href="/login">Log in</Link><Link href="/signup">Create account <ArrowUpRight size={14}/></Link></div><small>© {new Date().getFullYear()} StudySpace. Built for the in-between moments.</small></footer>
 </main>;
}
