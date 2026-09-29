"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Course = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};

type Quiz = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  question_count: number;
  time_limit_minutes: number | null;
  course_id: string | null;
  source: string;
  created_at: string;
};

type Question = {
  id: string;
  question: string;
  question_type:
    | "multiple_choice"
    | "true_false"
    | "short_answer";
  options: string[];
  topic: string;
  points: number;
};

type Result = {
  questionId: string;
  question: string;
  submittedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  points: number;
  explanation: string;
  topic: string;
};

type FilterType = "all" | "easy" | "medium" | "hard";

export default function QuizzesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(10);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const [activeQuiz, setActiveQuiz] = useState<{
    quiz: Quiz;
    questions: Question[];
  } | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [results, setResults] = useState<{
    percentage: number;
    correctCount: number;
    totalQuestions: number;
    results: Result[];
    topics: {
      topic: string;
      correct: number;
      total: number;
      percentage: number;
    }[];
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const [coursesResponse, quizzesResponse] =
        await Promise.all([
          supabase
            .from("courses")
            .select("id, code, name, description")
            .order("code"),

          supabase
            .from("quizzes")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),
        ]);

      if (coursesResponse.error) {
        throw new Error(coursesResponse.error.message);
      }

      if (quizzesResponse.error) {
        throw new Error(quizzesResponse.error.message);
      }

      setCourses((coursesResponse.data || []) as Course[]);
      setQuizzes((quizzesResponse.data || []) as Quiz[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const course = courses.find(
        (item) => item.id === quiz.course_id
      );

      const matchesSearch =
        !query ||
        quiz.title.toLowerCase().includes(query) ||
        quiz.description.toLowerCase().includes(query) ||
        course?.name.toLowerCase().includes(query) ||
        course?.code.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (filter !== "all") {
        return quiz.difficulty.toLowerCase() === filter;
      }

      return true;
    });
  }, [quizzes, courses, search, filter]);

  const aiQuizCount = quizzes.filter(
    (quiz) => quiz.source === "ai"
  ).length;

  const totalQuestions = quizzes.reduce(
    (sum, quiz) => sum + quiz.question_count,
    0
  );

  async function generateQuiz() {
    if (!selectedCourse) {
      return;
    }

    setGenerating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Your session has expired.");
      }

      const response = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          topic,
          difficulty,
          questionCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to generate quiz."
        );
      }

      const course = courses.find(
        (item) => item.id === selectedCourse
      );

      const title = topic
        ? `${course?.code || ""} — ${topic} Quiz`
        : `${course?.code || ""} — AI Practice Quiz`;

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          user_id: session.user.id,
          course_id: selectedCourse,
          title,
          description: `AI-generated ${difficulty} practice quiz.`,
          difficulty,
          question_count: data.questions.length,
          source: "ai",
          status: "published",
        })
        .select()
        .single();

      if (quizError) {
        throw new Error(quizError.message);
      }

      const questionRows = data.questions.map(
        (
          question: {
            question: string;
            question_type: string;
            options: string[];
            correct_answer: string;
            explanation: string;
            topic: string;
            points: number;
            question_order: number;
          },
          index: number
        ) => ({
          quiz_id: quiz.id,
          question_order:
            question.question_order || index + 1,
          question: question.question,
          question_type: question.question_type,
          options: question.options || [],
          correct_answer: question.correct_answer,
          explanation: question.explanation || "",
          topic: question.topic || "",
          points: question.points || 1,
        })
      );

      const { error: questionError } = await supabase
        .from("quiz_questions")
        .insert(questionRows);

      if (questionError) {
        await supabase
          .from("quizzes")
          .delete()
          .eq("id", quiz.id);

        throw new Error(questionError.message);
      }

      setShowGenerator(false);
      setTopic("");
      setSelectedCourse("");

      await loadData();
    } catch (error) {
      console.error(error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to generate quiz."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function startQuiz(quizId: string) {
    setResults(null);
    setAnswers({});

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Your session has expired.");
      }

      const response = await fetch(
        `/api/quizzes/${quizId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not load quiz."
        );
      }

      setActiveQuiz(data);
    } catch (error) {
      console.error(error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Could not load quiz."
      );
    }
  }

  async function submitQuiz() {
    if (!activeQuiz) return;

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Your session has expired.");
      }

      const response = await fetch(
        `/api/quizzes/${activeQuiz.quiz.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            answers,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to submit quiz."
        );
      }

      setResults(data);
    } catch (error) {
      console.error(error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to submit quiz."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteQuiz() {
    if (!deleteTarget) return;

    setDeleting(true);

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error(error);

      window.alert(error.message);
      setDeleting(false);
      return;
    }

    setQuizzes((current) =>
      current.filter(
        (quiz) => quiz.id !== deleteTarget.id
      )
    );

    setDeleteTarget(null);
    setDeleting(false);
  }

  function closeQuiz() {
    setActiveQuiz(null);
    setResults(null);
    setAnswers({});
  }

  if (activeQuiz) {
    return (
      <QuizRunner
        activeQuiz={activeQuiz}
        answers={answers}
        setAnswers={setAnswers}
        submitting={submitting}
        results={results}
        onSubmit={submitQuiz}
        onClose={closeQuiz}
        onRetry={() => {
          setResults(null);
          setAnswers({});
        }}
      />
    );
  }

  if (loading) {
    return (
      <AppShell
        title="Quizzes"
        description="Practice with personalized quizzes."
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2
              size={25}
              className="animate-spin text-violet-400"
            />
            <span className="text-xs text-white/30">
              Loading quizzes...
            </span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Quizzes"
      description="Practice with personalized quizzes."
    >
      <div className="mx-auto max-w-[1500px] space-y-7 pb-10">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-purple-500/[0.05] blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
                <Brain size={15} />
                Practice & assessment
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Quizzes
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/45 sm:text-base">
                Turn your courses into personalized practice
                sessions and find out what you actually know.
              </p>
            </div>

            <button
              onClick={() => setShowGenerator(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 active:scale-[0.98]"
            >
              <Sparkles size={17} />
              Generate quiz
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] sm:grid-cols-4">
          <QuizStat
            icon={<Brain size={17} />}
            value={quizzes.length}
            label="Quizzes"
          />

          <QuizStat
            icon={<Sparkles size={17} />}
            value={aiQuizCount}
            label="AI generated"
          />

          <QuizStat
            icon={<Target size={17} />}
            value={totalQuestions}
            label="Questions"
          />

          <QuizStat
            icon={<BookOpen size={17} />}
            value={courses.length}
            label="Courses"
          />
        </section>

        {/* Search + filters */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search quizzes or courses..."
                className="w-full rounded-xl border border-white/[0.07] bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-500/40"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </FilterButton>

              <FilterButton
                active={filter === "easy"}
                onClick={() => setFilter("easy")}
              >
                Easy
              </FilterButton>

              <FilterButton
                active={filter === "medium"}
                onClick={() => setFilter("medium")}
              >
                Medium
              </FilterButton>

              <FilterButton
                active={filter === "hard"}
                onClick={() => setFilter("hard")}
              >
                Hard
              </FilterButton>
            </div>
          </div>
        </section>

        {/* Section title */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              Your practice library
            </p>

            <p className="mt-1 text-xs text-white/30">
              {filteredQuizzes.length}{" "}
              {filteredQuizzes.length === 1
                ? "quiz"
                : "quizzes"}
              {search ? " matching your search" : ""}
            </p>
          </div>

          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-white/35 transition hover:text-white"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Quiz library */}
        {filteredQuizzes.length === 0 ? (
          <EmptyQuizState
            hasQuizzes={quizzes.length > 0}
            onCreate={() => setShowGenerator(true)}
            onClear={() => {
              setSearch("");
              setFilter("all");
            }}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredQuizzes.map((quiz) => {
              const course = courses.find(
                (item) => item.id === quiz.course_id
              );

              return (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  course={course}
                  onStart={() => startQuiz(quiz.id)}
                  onDelete={() => setDeleteTarget(quiz)}
                />
              );
            })}
          </div>
        )}

        {/* Generator */}
        {showGenerator && (
          <QuizGenerator
            courses={courses}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            topic={topic}
            setTopic={setTopic}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            questionCount={questionCount}
            setQuestionCount={setQuestionCount}
            generating={generating}
            onClose={() => setShowGenerator(false)}
            onGenerate={generateQuiz}
          />
        )}

        {/* Delete */}
        {deleteTarget && (
          <DeleteQuizModal
            quiz={deleteTarget}
            deleting={deleting}
            onCancel={() => {
              if (!deleting) {
                setDeleteTarget(null);
              }
            }}
            onConfirm={deleteQuiz}
          />
        )}
      </div>
    </AppShell>
  );
}

function QuizStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="border-b border-white/[0.07] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
        {icon}
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/30">
        {label}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-violet-500/15 text-violet-300"
          : "text-white/35 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function QuizCard({
  quiz,
  course,
  onStart,
  onDelete,
}: {
  quiz: Quiz;
  course?: Course;
  onStart: () => void;
  onDelete: () => void;
}) {
  const difficultyConfig = {
    easy: {
      className: "bg-emerald-500/10 text-emerald-300",
      label: "Easy",
    },
    medium: {
      className: "bg-amber-500/10 text-amber-300",
      label: "Medium",
    },
    hard: {
      className: "bg-red-500/10 text-red-300",
      label: "Hard",
    },
  };

  const config =
    difficultyConfig[
      quiz.difficulty.toLowerCase() as
        | "easy"
        | "medium"
        | "hard"
    ] || difficultyConfig.medium;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-500/20 hover:bg-white/[0.035]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-violet-600/[0.05] blur-3xl transition group-hover:bg-violet-600/[0.09]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/10 bg-violet-500/10 text-violet-300">
          {quiz.source === "ai" ? (
            <Sparkles size={19} />
          ) : (
            <BookOpen size={19} />
          )}
        </div>

        <button
          onClick={onDelete}
          title="Delete quiz"
          className="rounded-lg p-2 text-white/20 opacity-100 transition hover:bg-red-500/10 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="relative mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-violet-400">
            {course?.code || "Course"}
          </span>

          {quiz.source === "ai" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
              <Sparkles size={10} />
              AI
            </span>
          )}
        </div>

        <h2 className="mt-2 line-clamp-2 min-h-[48px] text-[15px] font-semibold leading-6 text-white">
          {quiz.title}
        </h2>

        <p className="mt-2 line-clamp-2 min-h-[40px] text-xs leading-5 text-white/30">
          {quiz.description}
        </p>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.045] px-2.5 py-1.5 text-[11px] text-white/45">
          <Target size={12} />
          {quiz.question_count} questions
        </span>

        <span
          className={`rounded-full px-2.5 py-1.5 text-[11px] font-medium ${config.className}`}
        >
          {config.label}
        </span>

        {quiz.time_limit_minutes && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.045] px-2.5 py-1.5 text-[11px] text-white/45">
            <Clock3 size={12} />
            {quiz.time_limit_minutes} min
          </span>
        )}
      </div>

      <button
        onClick={onStart}
        className="relative mt-6 flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-violet-400/30 hover:bg-violet-500/10"
      >
        Start quiz
        <ChevronRight size={16} className="text-white/35" />
      </button>
    </article>
  );
}

function EmptyQuizState({
  hasQuizzes,
  onCreate,
  onClear,
}: {
  hasQuizzes: boolean;
  onCreate: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/10 bg-violet-500/10 text-violet-400">
        {hasQuizzes ? (
          <Search size={22} />
        ) : (
          <Brain size={23} />
        )}
      </div>

      <h2 className="mt-5 text-lg font-semibold text-white">
        {hasQuizzes
          ? "No quizzes match"
          : "Build your first practice quiz"}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-white/35">
        {hasQuizzes
          ? "Try another search or difficulty filter."
          : "Choose a course, pick a topic, and let AI create a personalized quiz for you."}
      </p>

      {hasQuizzes ? (
        <button
          onClick={onClear}
          className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
        >
          Clear filters
        </button>
      ) : (
        <button
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          <Sparkles size={16} />
          Generate a quiz
        </button>
      )}
    </div>
  );
}

function QuizGenerator({
  courses,
  selectedCourse,
  setSelectedCourse,
  topic,
  setTopic,
  difficulty,
  setDifficulty,
  questionCount,
  setQuestionCount,
  generating,
  onClose,
  onGenerate,
}: {
  courses: Course[];
  selectedCourse: string;
  setSelectedCourse: (value: string) => void;
  topic: string;
  setTopic: (value: string) => void;
  difficulty: string;
  setDifficulty: (value: string) => void;
  questionCount: number;
  setQuestionCount: (value: number) => void;
  generating: boolean;
  onClose: () => void;
  onGenerate: () => void;
}) {
  const canGenerate = Boolean(selectedCourse);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/[0.09] bg-[#100b1c] shadow-2xl shadow-black/50">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/[0.07] bg-[#100b1c]/95 p-5 backdrop-blur-xl sm:p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-400">
              <Sparkles size={14} />
              AI quiz generator
            </div>

            <h2 className="mt-2 text-xl font-semibold text-white">
              Build a practice session
            </h2>

            <p className="mt-1 max-w-md text-xs leading-5 text-white/35">
              Gemini will generate questions based on the course
              and topic you provide.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={generating}
            className="rounded-xl p-2 text-white/30 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label className="mb-2 block text-xs font-medium text-white/55">
              Course
            </label>

            <select
              value={selectedCourse}
              onChange={(event) =>
                setSelectedCourse(event.target.value)
              }
              className="input"
            >
              <option value="">Select a course</option>

              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>

            {courses.length === 0 && (
              <p className="mt-2 text-xs text-amber-400/80">
                Add a course first before generating a quiz.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-white/55">
              Topic
              <span className="ml-2 text-white/20">
                optional
              </span>
            </label>

            <input
              value={topic}
              onChange={(event) =>
                setTopic(event.target.value)
              }
              placeholder="e.g. Derivatives, Thermodynamics, Java arrays..."
              className="input"
            />

            <p className="mt-2 text-[11px] text-white/25">
              Leave blank for a broader course review.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-white/55">
              Difficulty
            </label>

            <div className="grid grid-cols-3 gap-2">
              {["easy", "medium", "hard"].map((level) => {
                const active = difficulty === level;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize transition ${
                      active
                        ? level === "easy"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : level === "hard"
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border-white/[0.07] text-white/35 hover:bg-white/[0.04] hover:text-white/60"
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-white/55">
                Number of questions
              </label>

              <span className="text-xs font-semibold text-violet-300">
                {questionCount}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[5, 10, 15, 20, 30].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`rounded-xl border py-2.5 text-xs font-semibold transition ${
                    questionCount === count
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                      : "border-white/[0.07] text-white/35 hover:bg-white/[0.04]"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] p-4">
            <div className="flex gap-3">
              <div className="mt-0.5 text-violet-400">
                <Zap size={16} />
              </div>

              <div>
                <p className="text-xs font-semibold text-white/70">
                  AI-generated practice
                </p>

                <p className="mt-1 text-[11px] leading-5 text-white/30">
                  Questions will include explanations and topic
                  tags so you can understand mistakes after
                  submitting.
                </p>
              </div>
            </div>
          </div>

          <button
            disabled={!canGenerate || generating}
            onClick={onGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Generating your quiz...
              </>
            ) : (
              <>
                <Sparkles size={17} />
                Generate with Gemini
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizRunner({
  activeQuiz,
  answers,
  setAnswers,
  submitting,
  results,
  onSubmit,
  onClose,
  onRetry,
}: {
  activeQuiz: {
    quiz: Quiz;
    questions: Question[];
  };
  answers: Record<string, string>;
  setAnswers: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  submitting: boolean;
  results: {
    percentage: number;
    correctCount: number;
    totalQuestions: number;
    results: Result[];
    topics: {
      topic: string;
      correct: number;
      total: number;
      percentage: number;
    }[];
  } | null;
  onSubmit: () => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const answeredCount = Object.keys(answers).filter(
    (key) => answers[key]?.trim()
  ).length;

  const progress =
    activeQuiz.questions.length > 0
      ? Math.round(
          (answeredCount / activeQuiz.questions.length) * 100
        )
      : 0;

  if (results) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#080611]">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-400">
                <Trophy size={14} />
                Quiz results
              </div>

              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {activeQuiz.quiz.title}
              </h1>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-white/[0.08] p-2.5 text-white/40 transition hover:bg-white/[0.05] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Score */}
          <section className="relative mt-8 overflow-hidden rounded-3xl border border-violet-500/15 bg-violet-500/[0.06] p-7 text-center sm:p-10">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-3xl" />

            <div className="relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                {results.percentage >= 70 ? (
                  <Trophy size={24} />
                ) : (
                  <Target size={24} />
                )}
              </div>

              <p className="mt-5 text-sm text-white/40">
                Your score
              </p>

              <div className="mt-1 text-6xl font-bold tracking-tight text-white sm:text-7xl">
                {results.percentage}%
              </div>

              <p className="mt-3 text-sm text-white/40">
                {results.correctCount} of{" "}
                {results.totalQuestions} questions correct
              </p>
            </div>
          </section>

          {/* Topics */}
          {results.topics.length > 0 && (
            <section className="mt-6">
              <div className="mb-4">
                <p className="text-sm font-semibold text-white">
                  Topic performance
                </p>

                <p className="mt-1 text-xs text-white/30">
                  See where you are strongest and where more
                  practice could help.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {results.topics.map((topic) => (
                  <div
                    key={topic.topic}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="truncate text-sm font-medium text-white/70">
                        {topic.topic || "General"}
                      </span>

                      <span
                        className={`text-sm font-bold ${
                          topic.percentage >= 70
                            ? "text-emerald-300"
                            : topic.percentage >= 50
                              ? "text-amber-300"
                              : "text-red-300"
                        }`}
                      >
                        {topic.percentage}%
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full ${
                          topic.percentage >= 70
                            ? "bg-emerald-500"
                            : topic.percentage >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{
                          width: `${topic.percentage}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-[11px] text-white/25">
                      {topic.correct} / {topic.total} correct
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Detailed answers */}
          <section className="mt-8">
            <div className="mb-4">
              <p className="text-sm font-semibold text-white">
                Review your answers
              </p>

              <p className="mt-1 text-xs text-white/30">
                Learn from each question, not just the score.
              </p>
            </div>

            <div className="space-y-3">
              {results.results.map((result, index) => (
                <div
                  key={result.questionId}
                  className={`rounded-2xl border p-5 ${
                    result.isCorrect
                      ? "border-emerald-500/10 bg-emerald-500/[0.025]"
                      : "border-red-500/10 bg-red-500/[0.025]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        result.isCorrect
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {result.isCorrect ? (
                        <Check size={14} />
                      ) : (
                        <X size={14} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/25">
                        Question {index + 1}
                        {result.topic &&
                          ` · ${result.topic}`}
                      </div>

                      <p className="mt-2 text-sm font-medium leading-6 text-white">
                        {result.question}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-white/[0.025] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25">
                            Your answer
                          </p>

                          <p className="mt-1.5 text-xs leading-5 text-white/55">
                            {result.submittedAnswer ||
                              "No answer submitted"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/[0.025] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25">
                            Correct answer
                          </p>

                          <p className="mt-1.5 text-xs leading-5 text-emerald-300/80">
                            {result.correctAnswer}
                          </p>
                        </div>
                      </div>

                      {result.explanation && (
                        <div className="mt-3 border-l-2 border-violet-500/30 pl-3">
                          <p className="text-xs leading-5 text-white/35">
                            {result.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-sm font-semibold text-white/65 transition hover:bg-white/[0.05] hover:text-white"
            >
              <ArrowLeft size={16} />
              Try again
            </button>

            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Back to quizzes
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#080611]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-4 border-b border-white/[0.07] bg-[#080611]/90 px-4 pb-4 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-violet-400">
                <Brain size={14} />
                {activeQuiz.quiz.difficulty} practice
              </div>

              <h1 className="mt-1 truncate text-xl font-bold text-white sm:text-2xl">
                {activeQuiz.quiz.title}
              </h1>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-xl border border-white/[0.08] p-2.5 text-white/40 transition hover:bg-white/[0.05] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <span className="shrink-0 text-[11px] font-medium text-white/30">
              {answeredCount}/{activeQuiz.questions.length}
            </span>
          </div>
        </div>

        {/* Questions */}
        <div className="mt-6 space-y-4 sm:mt-8">
          {activeQuiz.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              total={activeQuiz.questions.length}
              answer={answers[question.id] || ""}
              onAnswer={(value) =>
                setAnswers((current) => ({
                  ...current,
                  [question.id]: value,
                }))
              }
            />
          ))}
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 mt-6 -mx-4 border-t border-white/[0.07] bg-[#080611]/90 px-4 py-4 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Grading your quiz...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Submit quiz
              </>
            )}
          </button>

          <p className="mt-2 text-center text-[11px] text-white/20">
            You can submit even if some questions are unanswered.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  answer,
  onAnswer,
}: {
  question: Question;
  index: number;
  total: number;
  answer: string;
  onAnswer: (value: string) => void;
}) {
  const options =
    question.question_type === "true_false"
      ? question.options.length
        ? question.options
        : ["True", "False"]
      : question.options;

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-400">
          Question {index + 1} / {total}
        </span>

        <div className="flex items-center gap-2">
          {question.topic && (
            <span className="hidden rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/30 sm:block">
              {question.topic}
            </span>
          )}

          <span className="text-[10px] text-white/20">
            {question.points}{" "}
            {question.points === 1 ? "pt" : "pts"}
          </span>
        </div>
      </div>

      <h2 className="mt-4 text-[15px] font-semibold leading-7 text-white sm:text-base">
        {question.question}
      </h2>

      {question.question_type === "short_answer" ? (
        <textarea
          value={answer}
          onChange={(event) =>
            onAnswer(event.target.value)
          }
          placeholder="Write your answer..."
          rows={5}
          className="input mt-5 min-h-32 resize-y"
        />
      ) : (
        <div className="mt-5 space-y-2">
          {options.map((option, optionIndex) => {
            const selected = answer === option;

            return (
              <button
                key={`${question.id}-${option}`}
                onClick={() => onAnswer(option)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                  selected
                    ? "border-violet-500/40 bg-violet-500/10 text-white"
                    : "border-white/[0.07] bg-white/[0.015] text-white/55 hover:border-white/[0.12] hover:bg-white/[0.035] hover:text-white"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    selected
                      ? "border-violet-400 bg-violet-500 text-white"
                      : "border-white/[0.1] text-white/25"
                  }`}
                >
                  {selected ? (
                    <Check size={13} />
                  ) : (
                    String.fromCharCode(65 + optionIndex)
                  )}
                </span>

                <span className="leading-5">
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DeleteQuizModal({
  quiz,
  deleting,
  onCancel,
  onConfirm,
}: {
  quiz: Quiz;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.09] bg-[#100b1c] p-6 shadow-2xl shadow-black/50">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
          <Trash2 size={19} />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-white">
          Delete quiz?
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/40">
          This will permanently remove{" "}
          <span className="font-medium text-white/70">
            “{quiz.title}”
          </span>
          . This action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-white/50 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {deleting && (
              <Loader2
                size={15}
                className="animate-spin"
              />
            )}

            {deleting ? "Deleting..." : "Delete quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}