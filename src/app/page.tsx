import Link from "next/link";
import {
  ArrowUpRight, BookOpen, Brain, CalendarDays, CheckCircle2,
  ClipboardList, Clock3, GraduationCap, NotebookPen, Sparkles,
} from "lucide-react";

const tools = [
  { n: "01", icon: ClipboardList, title: "Assignments", desc: "Know what’s due, what’s done, and what needs a little more time.", href: "/assignments", color: "coral" },
  { n: "02", icon: BookOpen, title: "Your courses", desc: "Keep course notes, tasks, and useful links together.", href: "/courses", color: "blue" },
  { n: "03", icon: CalendarDays, title: "Calendar", desc: "See the shape of your week before it gets away from you.", href: "/calendar", color: "yellow" },
  { n: "04", icon: Brain, title: "Study buddy", desc: "Work through confusing topics, one question at a time.", href: "/ai-tutor", color: "green" },
];

export default function Home() {
  return (
    <main className="ss-home">
      <nav className="ss-nav">
        <Link href="/" className="ss-wordmark"><span className="ss-mark"><NotebookPen size={19} /></span> studyspace<span className="ss-wordmark-period">.</span></Link>
        <div className="ss-nav-note"><span className="ss-live-dot" /> A little more room to think</div>
        <div className="ss-nav-actions"><Link href="/login" className="ss-login">Log in</Link><Link href="/signup" className="ss-button ss-button-dark">Make it yours <ArrowUpRight size={16}/></Link></div>
      </nav>

      <section className="ss-hero">
        <div className="ss-hero-copy">
          <p className="ss-eyebrow"><span>THE STUDENT DESK</span> · MADE FOR REAL LIFE</p>
          <h1>Less juggling.<br/>More <em>figuring it out.</em></h1>
          <p className="ss-hero-text">Your courses, deadlines, notes and late-night questions — in one calm corner of the internet. Built for students, not school administrators.</p>
          <div className="ss-hero-ctas"><Link href="/signup" className="ss-button ss-button-dark">Find your flow <ArrowUpRight size={17}/></Link><Link href="#the-desk" className="ss-text-link">Take a look <span>↓</span></Link></div>
          <div className="ss-proof"><div className="ss-proof-avatars"><span>S</span><span>✳</span><span>+</span></div><p><strong>Your space, your pace.</strong><br/>No teacher accounts. No classroom admin.</p></div>
        </div>
        <div className="ss-hero-art" aria-label="Illustration of a student's desk and weekly planner">
          <div className="ss-sunburst">✳</div>
          <div className="ss-sticker ss-sticker-top">YOU’VE GOT THIS.</div>
          <div className="ss-paper">
            <div className="ss-paper-top"><span>MONDAY, SORTED</span><span>WEEK 04</span></div>
            <h2>A week that<br/><em>makes sense.</em></h2>
            <div className="ss-task"><span className="ss-check checked"><CheckCircle2 size={15}/></span><div><b>Read chapter 6</b><small>Psychology · 20 min</small></div><span className="ss-task-done">DONE</span></div>
            <div className="ss-task"><span className="ss-check"><Clock3 size={15}/></span><div><b>Calculus problem set</b><small>Math · Due tomorrow</small></div><span className="ss-task-time">TODAY</span></div>
            <div className="ss-task"><span className="ss-check"><Sparkles size={15}/></span><div><b>Review lecture notes</b><small>Biology · 30 min</small></div></div>
            <div className="ss-paper-footer"><span>3 small steps add up.</span><span>↗</span></div>
          </div>
          <div className="ss-sticker ss-sticker-bottom"><span>✳</span> progress, not perfection</div>
          <div className="ss-orbit ss-orbit-one"></div><div className="ss-orbit ss-orbit-two"></div>
        </div>
      </section>

      <section className="ss-marquee"><span>YOUR BRAIN HAS ENOUGH TABS OPEN</span><span>✳</span><span>LET’S GET THE IMPORTANT STUFF OUT OF YOUR HEAD</span><span>✳</span><span>YOUR BRAIN HAS ENOUGH TABS OPEN</span></section>

      <section className="ss-tools" id="the-desk">
        <div className="ss-section-heading"><div><p className="ss-eyebrow">A DESK FOR ALL THE MOVING PARTS</p><h2>Everything has<br/>a place. <em>Finally.</em></h2></div><p>Not another app shouting at you to optimise your life. Just useful tools that help you get through the semester feeling a little more on top of things.</p></div>
        <div className="ss-tool-grid">{tools.map(({n,icon:Icon,title,desc,href,color}) => <Link href={href} key={n} className={`ss-tool-card ss-${color}`}><div className="ss-tool-card-top"><span>{n} / 04</span><span className="ss-tool-icon"><Icon size={20}/></span></div><h3>{title}</h3><p>{desc}</p><div className="ss-tool-arrow"><span>Explore tool</span><ArrowUpRight size={17}/></div></Link>)}</div>
        <div className="ss-bottom-note"><span className="ss-note-star">✳</span><p><strong>Built around the way students actually work.</strong><br/>Messy weeks happen. StudySpace helps you find your next step — not pretend you have it all together.</p><Link href="/signup">Get started <ArrowUpRight size={15}/></Link></div>
      </section>
      <footer className="ss-footer"><Link href="/" className="ss-wordmark"><span className="ss-mark"><NotebookPen size={17}/></span> studyspace<span className="ss-wordmark-period">.</span></Link><span>Made for the in-between moments.</span><Link href="/login">Already here? Sign in ↗</Link></footer>
    </main>
  );
}
