"use client";

import {
  ArrowRight,
  BookOpen,
  Clock,
  FileQuestion,
  Plus,
  Trophy,
} from "lucide-react";
import AppShell from "@/components/AppShell";

const quizzes = [
  {
    title: "Thermodynamics Fundamentals",
    course: "PHY 1001",
    questions: 15,
    duration: "25 min",
    due: "Today",
    status: "Available",
  },
  {
    title: "Integration Techniques",
    course: "MAT 1002",
    questions: 20,
    duration: "35 min",
    due: "Sep 29",
    status: "Upcoming",
  },
  {
    title: "Functions & Arrays",
    course: "CSI 1100",
    questions: 12,
    duration: "20 min",
    due: "Oct 2",
    status: "Upcoming",
  },
  {
    title: "Academic Writing Basics",
    course: "ENG 1001",
    questions: 10,
    duration: "15 min",
    due: "Oct 5",
    status: "Upcoming",
  },
];

export default function QuizzesPage() {
  return (
    <AppShell
      title="Quizzes"
      description="Test your knowledge and track your progress"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-violet-400">
              Knowledge check
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Quizzes
            </h1>

            <p className="mt-2 text-sm text-white/35">
              Reinforce what you learn with quick knowledge checks.
            </p>
          </div>

          <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white">
            <Plus size={17} />
            Create quiz
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <QuizStat
            icon={<FileQuestion size={18} />}
            label="Available"
            value="1"
          />

          <QuizStat
            icon={<Clock size={18} />}
            label="Upcoming"
            value="3"
          />

          <QuizStat
            icon={<Trophy size={18} />}
            label="Average score"
            value="87%"
          />
        </div>

        {/* Quiz cards */}
        <div className="grid gap-5 md:grid-cols-2">
          {quizzes.map((quiz) => (
            <div
              key={quiz.title}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-violet-400/20 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <BookOpen size={19} />
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    quiz.status === "Available"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-white/[0.05] text-white/40"
                  }`}
                >
                  {quiz.status}
                </span>
              </div>

              <p className="mt-5 text-xs font-semibold text-violet-400">
                {quiz.course}
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                {quiz.title}
              </h2>

              <div className="mt-5 flex gap-4 text-xs text-white/35">
                <span>{quiz.questions} questions</span>
                <span>•</span>
                <span>{quiz.duration}</span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <span className="text-xs text-white/30">
                  Due {quiz.due}
                </span>

                <button
                  disabled={quiz.status !== "Available"}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-white/25"
                >
                  {quiz.status === "Available"
                    ? "Start quiz"
                    : "View details"}

                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function QuizStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
        {icon}
      </div>

      <p className="text-xs text-white/35">{label}</p>

      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}