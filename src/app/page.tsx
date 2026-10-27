import Link from "next/link";
import {
  ArrowDownRight, ArrowUpRight, BookOpen, Brain, CalendarDays,
  Check, ClipboardList, MoveUpRight, NotebookTabs, Sparkles,
} from "lucide-react";

const tools = [
  { number: "01", icon: ClipboardList, title: "Assignments", text: "The stuff due soon. The stuff you finished. The stuff you forgot existed.", href: "/assignments", tone: "lemon" },
  { number: "02", icon: BookOpen, title: "Courses", text: "All your classes, notes and useful bits in one place.", href: "/courses", tone: "blue" },
  { number: "03", icon: CalendarDays, title: "Calendar", text: "Make the week look less like a pile-up.", href: "/calendar", tone: "pink" },
  { number: "04", icon: Brain, title: "Study room", text: "Ask questions, untangle concepts, keep going.", href: "/ai-tutor", tone: "orange" },
];

export default function Home() {
  return (
    <main className="ss-home">
      <nav className="ss-nav">
        <Link href="/" className="ss-wordmark"><span className="ss-logo-shape">S</span><span>studyspace<span className="ss-period">®</span></span></Link>
        <span className="ss-nav-center"><span className="ss-nav-dot" /> YOUR LIFE, A LITTLE LESS TAB-BASED</span>
        <div className="ss-nav-actions"><Link href="/login" className="ss-login">Log in</Link><Link href="/signup" className="ss-join">Get in here <MoveUpRight size={15}/></Link></div>
      </nav>

      <section className="ss-hero">
        <div className="ss-hero-copy">
          <div className="ss-kicker"><span>THE STUDENT TOOLKIT</span><span className="ss-kicker-line" /> ISSUE NO. 001</div>
          <h1>School is<br/>a lot. <span>We get it.</span></h1>
          <p className="ss-hero-text">One spot for the deadlines, the course chaos, the 11:48 p.m. questions, and the tiny wins. Made for students doing their best with seventeen things going on.</p>
          <div className="ss-hero-actions"><Link href="/signup" className="ss-cta">Make some space <ArrowUpRight size={18}/></Link><Link href="#toolkit" className="ss-scroll-link">See what’s inside <ArrowDownRight size={16}/></Link></div>
          <div className="ss-hand-note"><span className="ss-hand-arrow">↘</span><span>For your actual student life.<br/><b>No teacher portals. No admin bloat.</b></span></div>
        </div>

        <div className="ss-collage" aria-label="Graphic collage of student planning tools">
          <div className="ss-collage-grid" />
          <div className="ss-stamp">MADE FOR<br/>THE MESS</div>
          <div className="ss-note-card">
            <div className="ss-note-head"><span>THIS WEEK</span><span>MON — SUN ↗</span></div>
            <h2>Little by<br/>little <i>counts.</i></h2>
            <div className="ss-note-task"><span className="ss-note-check"><Check size={13}/></span><span><b>Finish bio notes</b><small>15 min · Biology</small></span><em>DONE</em></div>
            <div className="ss-note-task"><span className="ss-note-empty" /><span><b>Calc problem set</b><small>Due tomorrow · Math</small></span><em className="ss-due">UP NEXT</em></div>
            <div className="ss-note-task"><span className="ss-note-empty" /><span><b>Take an actual break</b><small>Seriously. Water too.</small></span></div>
            <div className="ss-note-foot">PROGRESS ≠ PERFECTION <span>✳</span></div>
          </div>
          <div className="ss-yellow-tile"><Sparkles size={22}/><span>ONE THING<br/>AT A TIME.</span></div>
          <div className="ss-blue-tile"><NotebookTabs size={28}/><span>YOUR<br/>CORNER.</span></div>
          <div className="ss-orange-burst">✳</div>
          <div className="ss-side-caption">A WORK IN PROGRESS, JUST LIKE YOU.</div>
        </div>
      </section>

      <div className="ss-ribbon"><span>LESS SPINNING YOUR WHEELS</span><b>✳</b><span>MORE GETTING SOMEWHERE</span><b>✳</b><span>YOU’RE ALLOWED TO FIGURE IT OUT AS YOU GO</span></div>

      <section className="ss-toolkit" id="toolkit">
        <div className="ss-toolkit-head"><div><p className="ss-kicker">YOUR OPEN TABS, ORGANIZED</p><h2>Four tools.<br/><span>One less headache.</span></h2></div><p>Not a life coach. Not another productivity lecture. Just a handful of genuinely useful places to put the things you’re carrying around in your head.</p></div>
        <div className="ss-tools-grid">{tools.map(({number,icon:Icon,title,text,href,tone}) => <Link href={href} key={number} className={`ss-tool-card ss-tone-${tone}`}><div className="ss-tool-top"><span>{number} / TOOL</span><Icon size={21}/></div><h3>{title}</h3><p>{text}</p><div className="ss-tool-bottom"><span>OPEN TOOL</span><ArrowUpRight size={17}/></div></Link>)}</div>
        <div className="ss-bottom-banner"><span className="ss-banner-mark">S.</span><div><b>You don’t need a perfect system.</b><p>You just need somewhere to start.</p></div><Link href="/signup">Start here <ArrowUpRight size={17}/></Link></div>
      </section>

      <footer className="ss-footer"><Link href="/" className="ss-wordmark"><span className="ss-logo-shape">S</span><span>studyspace<span className="ss-period">®</span></span></Link><span>MADE FOR THE SEMESTER YOU’RE ACTUALLY HAVING.</span><Link href="/login">Already have a space? ↗</Link></footer>
    </main>
  );
}
