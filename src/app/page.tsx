"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, BrainCircuit, CalendarDays, CheckCircle2, FileText, Layers3, Menu, X, BookOpen, GraduationCap } from "lucide-react";
import StudySpaceMark from "@/components/StudySpaceMark";
import LandingUniverse from "@/components/LandingUniverse";

const features = [
 {n:"01",name:"Your courses",detail:"Keep lectures, notes, resources and course work connected.",icon:BookOpen},
 {n:"02",name:"An AI that studies with you",detail:"Ask, explore, practise and get help grounded in your learning.",icon:BrainCircuit},
 {n:"03",name:"Your work, in motion",detail:"Assignments, quizzes, flashcards and feedback in one flow.",icon:FileText},
 {n:"04",name:"Time that makes sense",detail:"Plan your week, track deadlines and protect focused study time.",icon:CalendarDays},
];
export default function Home(){
 const [menu,setMenu]=useState(false);
 return <main className="ss-landing">
  <div className="ss-landing-grain" aria-hidden="true"/>
  <header className="ss-landing-nav">
   <Link href="/" className="ss-landing-brand"><StudySpaceMark size={34}/><span>STUDYSPACE</span></Link>
   <nav className="ss-landing-links" aria-label="Main navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#about">About</a></nav>
   <div className="ss-landing-actions"><Link href="/login" className="ss-landing-enter">Enter <ArrowUpRight size={14}/></Link><Link href="/signup" className="ss-landing-signup">Sign up <ArrowRight size={14}/></Link></div>
   <button className="ss-landing-menu" onClick={()=>setMenu(v=>!v)} aria-label={menu?"Close menu":"Open menu"} aria-expanded={menu}>{menu?<X/>:<Menu/>}</button>
  </header>
  {menu&&<nav className="ss-landing-mobile"><a href="#features" onClick={()=>setMenu(false)}>Features</a><a href="#how-it-works" onClick={()=>setMenu(false)}>How it works</a><a href="#about" onClick={()=>setMenu(false)}>About</a><Link href="/login" onClick={()=>setMenu(false)}>Enter your space</Link><Link href="/signup" onClick={()=>setMenu(false)}>Create an account <ArrowRight size={15}/></Link></nav>}
  <section className="ss-landing-hero">
   <LandingUniverse/>
   <div className="ss-landing-hero-shade"/>
   <div className="ss-landing-hero-content">
    <div className="ss-landing-eyebrow"><span/> THE STUDENT SPACE, REIMAGINED <i>·</i> 2026</div>
    <h1>Your whole<br/><em>student life,</em><br/>in one space.</h1>
    <p>Courses, assignments, notes, planning and an AI study partner — connected in one place, so you can focus on what comes next.</p>
    <div className="ss-landing-hero-ctas"><Link href="/signup" className="ss-landing-primary">Create your space <ArrowUpRight size={17}/></Link><a href="#features" className="ss-landing-discover">Explore StudySpace <ArrowDown size={15}/></a></div>
   </div>
   <div className="ss-landing-hero-foot"><span>BUILT FOR STUDENTS</span><span>ONE CONNECTED WORKSPACE</span><span>SCROLL TO EXPLORE ↓</span></div>
   <div className="ss-landing-live-label"><span className="ss-live-dot"/> YOUR SPACE IS WAITING</div>
  </section>
  <section className="ss-landing-intro" id="about">
   <div className="ss-section-index">A BETTER WAY TO STUDY <span>01 / 03</span></div>
   <div className="ss-landing-intro-grid"><h2>Less switching.<br/><em>More becoming.</em></h2><div><p>Student life is already full. Your tools shouldn't make it harder. StudySpace brings the moving parts of your education together, giving every course, task and idea a place to live.</p><Link href="/signup" className="ss-inline-link">Make it yours <ArrowUpRight size={15}/></Link></div></div>
  </section>
  <section className="ss-landing-features" id="features">
   <div className="ss-section-index">THE WORKSPACE <span>02 / 03</span></div>
   <div className="ss-features-heading"><h2>Everything connected.<br/><em>Nothing in the way.</em></h2><p>One home for the work that makes a semester.</p></div>
   <div className="ss-feature-grid">{features.map((f,i)=>{const Icon=f.icon;return <article className={"ss-feature-card ss-feature-card-"+(i+1)} key={f.n}><div className="ss-feature-top"><span>{f.n} / 04</span><Icon size={22}/></div><div className="ss-feature-graphic"><div className="ss-feature-orbit"/><div className="ss-feature-core"><Icon size={32}/></div><span className="ss-feature-node n1"/><span className="ss-feature-node n2"/><span className="ss-feature-node n3"/></div><div className="ss-feature-copy"><h3>{f.name}</h3><p>{f.detail}</p></div><span className="ss-feature-arrow"><ArrowUpRight size={17}/></span></article>})}</div>
  </section>
  <section className="ss-landing-ai" id="how-it-works">
   <div className="ss-ai-visual"><div className="ss-ai-ring r1"/><div className="ss-ai-ring r2"/><div className="ss-ai-ring r3"/><div className="ss-ai-core"><BrainCircuit size={58}/></div><span className="ss-ai-pulse p1"/><span className="ss-ai-pulse p2"/><span className="ss-ai-pulse p3"/><div className="ss-ai-coordinate">INTELLIGENCE / 01</div></div>
   <div className="ss-ai-copy"><div className="ss-section-index">A STUDY PARTNER THAT KNOWS YOUR WORK <span>03 / 03</span></div><h2>Think it through.<br/><em>With a little help.</em></h2><p>StudySpace AI helps you understand difficult ideas, practise for exams and work through problems. It can draw on your course materials and learning history to make each conversation more useful.</p><ul><li><CheckCircle2/> Ask questions and explore concepts</li><li><CheckCircle2/> Practise with quizzes and flashcards</li><li><CheckCircle2/> Get feedback and find your next step</li></ul><Link href="/signup" className="ss-inline-link">Meet your study partner <ArrowUpRight size={15}/></Link></div>
  </section>
  <section className="ss-landing-final"><div className="ss-final-orbit"/><div className="ss-section-index">START WHERE YOU ARE <span>STUDYSPACE</span></div><h2>Make space for<br/><em>what matters.</em></h2><p>Your next semester starts with one small step.</p><Link href="/signup" className="ss-landing-primary">Create your account <ArrowUpRight size={17}/></Link><div className="ss-final-existing">Already have a space? <Link href="/login">Enter here <ArrowRight size={13}/></Link></div></section>
  <footer className="ss-landing-footer"><Link href="/" className="ss-landing-brand"><StudySpaceMark size={28}/><span>STUDYSPACE</span></Link><span>YOUR STUDENT LIFE, IN ONE SPACE.</span><div><Link href="/login">Enter</Link><Link href="/signup">Sign up</Link></div><small>© {new Date().getFullYear()} StudySpace</small></footer>
 </main>;
}
