import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  Upload,
  BookOpen,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Tutor",
    description:
      "Get explanations, study help, and guidance whenever you get stuck.",
  },
  {
    icon: BookOpen,
    title: "Course hubs",
    description:
      "Keep everything for each course organized in one focused workspace.",
  },
  {
    icon: ClipboardCheck,
    title: "Assignments",
    description:
      "Track deadlines and stay on top of what needs to get done next.",
  },
  {
    icon: CalendarDays,
    title: "Smart calendar",
    description:
      "See your academic schedule without jumping between different apps.",
  },
  {
    icon: Upload,
    title: "Homework analysis",
    description:
      "Upload your work and use AI-powered feedback to understand where you can improve.",
  },
  {
    icon: Zap,
    title: "Less mental overhead",
    description:
      "Spend less time organizing school and more time actually learning.",
  },
];

export default function Home() {
  return (
    <main className="landing-page">
      <div className="landing-background" />

      <nav className="landing-nav">
        <Link href="/" className="landing-brand">
          <span className="brand-mark">
            <GraduationCap size={20} strokeWidth={2.2} />
          </span>
          <span>StudySpace</span>
        </Link>

        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#why-studyspace">Why StudySpace</a>
        </div>

        <div className="landing-nav-actions">
          <Link href="/login" className="landing-login">
            Log in
          </Link>
          <Link href="/signup" className="landing-signup">
            Get started
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Your student workspace</span>
          </div>

          <h1>
            Your entire student life.
            <span> In one space.</span>
          </h1>

          <p>
            Courses, assignments, quizzes, your calendar, homework and an AI
            tutor — all brought together into one focused workspace built for
            students.
          </p>

          <div className="hero-actions">
            <Link href="/signup" className="hero-primary">
              Start for free
              <ArrowRight size={18} />
            </Link>

            <Link href="/login" className="hero-secondary">
              I already have an account
            </Link>
          </div>

          <div className="hero-trust">
            <div className="trust-item">
              <CheckCircle2 size={15} />
              <span>Everything in one place</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={15} />
              <span>Built for students</span>
            </div>
          </div>
        </div>

        <div className="hero-product">
          <div className="product-glow" />

          <div className="product-window">
            <div className="product-sidebar">
              <div className="mini-logo">
                <GraduationCap size={15} />
                <span>StudySpace</span>
              </div>

              <div className="mini-nav">
                <div className="mini-nav-item active">
                  <LayoutDashboard size={14} />
                  Dashboard
                </div>
                <div className="mini-nav-item">
                  <Brain size={14} />
                  AI Tutor
                </div>
                <div className="mini-nav-item">
                  <BookOpen size={14} />
                  Courses
                </div>
                <div className="mini-nav-item">
                  <ClipboardCheck size={14} />
                  Assignments
                </div>
                <div className="mini-nav-item">
                  <CalendarDays size={14} />
                  Calendar
                </div>
              </div>
            </div>

            <div className="product-main">
              <div className="product-topbar">
                <div>
                  <div className="preview-eyebrow">Monday, September 29</div>
                  <div className="preview-title">Good morning 👋</div>
                </div>

                <div className="preview-avatar">S</div>
              </div>

              <div className="preview-grid">
                <div className="preview-card preview-card-large">
                  <div className="preview-card-header">
                    <span>Today</span>
                    <span className="preview-muted">4 tasks</span>
                  </div>

                  <div className="preview-task completed">
                    <span className="task-check">✓</span>
                    <div>
                      <strong>Review calculus notes</strong>
                      <small>MAT 1341 · 9:00 AM</small>
                    </div>
                  </div>

                  <div className="preview-task">
                    <span className="task-circle" />
                    <div>
                      <strong>Finish programming assignment</strong>
                      <small>CSI 2132 · Due tonight</small>
                    </div>
                  </div>

                  <div className="preview-task">
                    <span className="task-circle" />
                    <div>
                      <strong>Study for physics quiz</strong>
                      <small>PHY 1121 · Tomorrow</small>
                    </div>
                  </div>
                </div>

                <div className="preview-card ai-card">
                  <div className="ai-icon">
                    <Brain size={17} />
                  </div>
                  <span className="preview-label">AI Tutor</span>
                  <strong>Need help with something?</strong>
                  <p>
                    Ask a question and start learning without leaving your
                    workspace.
                  </p>
                  <div className="ai-button">
                    Ask AI
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>

              <div className="preview-bottom">
                <div className="mini-stat">
                  <span>Courses</span>
                  <strong>5</strong>
                </div>
                <div className="mini-stat">
                  <span>Due this week</span>
                  <strong>8</strong>
                </div>
                <div className="mini-stat">
                  <span>Study streak</span>
                  <strong>12 days</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="section-heading">
          <div className="section-eyebrow">Everything you need</div>
          <h2>
            School is complicated enough.
            <span>Your workspace shouldn&apos;t be.</span>
          </h2>
          <p>
            StudySpace brings the scattered pieces of student life together
            into one simple system.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div className="feature-card" key={feature.title}>
                <div className="feature-icon">
                  <Icon size={20} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ArrowRight className="feature-arrow" size={17} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-section workflow-section" id="how-it-works">
        <div className="section-heading">
          <div className="section-eyebrow">How it works</div>
          <h2>
            Open StudySpace.
            <span>Know what to do next.</span>
          </h2>
        </div>

        <div className="workflow-grid">
          <div className="workflow-step">
            <span>01</span>
            <h3>Bring your courses together</h3>
            <p>
              Create your course spaces and keep the important information
              where you can actually find it.
            </p>
          </div>

          <div className="workflow-line" />

          <div className="workflow-step">
            <span>02</span>
            <h3>Stay ahead of your work</h3>
            <p>
              Track assignments, quizzes, deadlines and upcoming events from
              one dashboard.
            </p>
          </div>

          <div className="workflow-line" />

          <div className="workflow-step">
            <span>03</span>
            <h3>Use AI when you need it</h3>
            <p>
              Get explanations, study help and feedback without leaving your
              academic workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section why-section" id="why-studyspace">
        <div className="why-card">
          <div className="why-content">
            <div className="section-eyebrow">Why StudySpace</div>

            <h2>
              Stop managing
              <span>school. Start doing it.</span>
            </h2>

            <p>
              Switching between calendars, notes, learning platforms, AI
              tools and random documents creates unnecessary friction.
              StudySpace is designed to give all of that a single home.
            </p>

            <Link href="/signup" className="hero-primary">
              Create your workspace
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="why-visual">
            <div className="floating-card card-one">
              <CheckCircle2 size={17} />
              <div>
                <strong>Assignment completed</strong>
                <span>Programming · 10 minutes ago</span>
              </div>
            </div>

            <div className="floating-card card-two">
              <Brain size={17} />
              <div>
                <strong>AI Tutor</strong>
                <span>Ready when you are</span>
              </div>
            </div>

            <div className="floating-card card-three">
              <CalendarDays size={17} />
              <div>
                <strong>Physics quiz</strong>
                <span>Tomorrow · 10:30 AM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="cta-glow" />

        <div className="cta-content">
          <div className="section-eyebrow">Your new student workspace</div>

          <h2>
            Everything in one place.
            <span>Finally.</span>
          </h2>

          <p>
            Start organizing your academic life with StudySpace.
          </p>

          <Link href="/signup" className="hero-primary">
            Get started for free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-brand">
          <span className="brand-mark">
            <GraduationCap size={18} />
          </span>
          <span>StudySpace</span>
        </div>

        <span>Built for students who have enough tabs open.</span>
      </footer>
    </main>
  );
}