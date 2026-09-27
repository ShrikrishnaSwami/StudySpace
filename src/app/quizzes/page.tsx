"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
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

export default function QuizzesPage() {
  const [courses, setCourses] =
    useState<Course[]>([]);

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [showGenerator, setShowGenerator] =
    useState(false);

  const [selectedCourse, setSelectedCourse] =
    useState("");

  const [topic, setTopic] =
    useState("");

  const [difficulty, setDifficulty] =
    useState("medium");

  const [questionCount, setQuestionCount] =
    useState(10);

  const [activeQuiz, setActiveQuiz] =
    useState<{
      quiz: Quiz;
      questions: Question[];
    } | null>(null);

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [submitting, setSubmitting] =
    useState(false);

  const [results, setResults] =
    useState<{
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

  async function loadData() {
    setLoading(true);

    try {
      const [
        coursesResponse,
        quizzesResponse,
      ] = await Promise.all([
        supabase
          .from("courses")
          .select(
            "id, code, name, description"
          )
          .order("code"),

        supabase
          .from("quizzes")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (coursesResponse.error) {
        throw new Error(
          coursesResponse.error.message
        );
      }

      if (quizzesResponse.error) {
        throw new Error(
          quizzesResponse.error.message
        );
      }

      setCourses(
        (coursesResponse.data ||
          []) as Course[]
      );

      setQuizzes(
        (quizzesResponse.data ||
          []) as Quiz[]
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const loadDataTimer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(loadDataTimer);
  }, []);

  async function generateQuiz() {
    if (!selectedCourse) {
      alert("Select a course first.");
      return;
    }

    setGenerating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Your session has expired."
        );
      }

      const response = await fetch(
        "/api/ai/quiz",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            courseId: selectedCourse,
            topic,
            difficulty,
            questionCount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to generate quiz."
        );
      }

      const course = courses.find(
        (item) =>
          item.id === selectedCourse
      );

      const title = topic
        ? `${course?.code || ""} — ${topic} Quiz`
        : `${course?.code || ""} — AI Practice Quiz`;

      const {
        data: quiz,
        error: quizError,
      } = await supabase
        .from("quizzes")
        .insert({
          user_id: session.user.id,
          course_id: selectedCourse,
          title,
          description: `AI-generated ${difficulty} practice quiz.`,
          difficulty,
          question_count:
            data.questions.length,
          source: "ai",
          status: "published",
        })
        .select()
        .single();

      if (quizError) {
        throw new Error(
          quizError.message
        );
      }

      const questionRows =
        data.questions.map(
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
              question.question_order ||
              index + 1,
            question:
              question.question,
            question_type:
              question.question_type,
            options:
              question.options || [],
            correct_answer:
              question.correct_answer,
            explanation:
              question.explanation || "",
            topic:
              question.topic || "",
            points:
              question.points || 1,
          })
        );

      const { error: questionError } =
        await supabase
          .from("quiz_questions")
          .insert(questionRows);

      if (questionError) {
        await supabase
          .from("quizzes")
          .delete()
          .eq("id", quiz.id);

        throw new Error(
          questionError.message
        );
      }

      setShowGenerator(false);

      setTopic("");

      await loadData();
    } catch (error) {
      alert(
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
        throw new Error(
          "Your session has expired."
        );
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
          data.error ||
            "Could not load quiz."
        );
      }

      setActiveQuiz(data);
    } catch (error) {
      alert(
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
        throw new Error(
          "Your session has expired."
        );
      }

      const response = await fetch(
        `/api/quizzes/${activeQuiz.quiz.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
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
          data.error ||
            "Failed to submit quiz."
        );
      }

      setResults(data);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to submit quiz."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteQuiz(id: string) {
    const confirmed = window.confirm(
      "Delete this quiz?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setQuizzes((current) =>
      current.filter(
        (quiz) => quiz.id !== id
      )
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-violet-400" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        {/* HEADER */}

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-violet-300">
              <Brain size={16} />
              Practice & assessment
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Quizzes
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/45">
              Generate personalized quizzes from
              your actual courses and notes.
            </p>
          </div>

          <button
            onClick={() =>
              setShowGenerator(true)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            <Sparkles size={17} />
            Generate quiz
          </button>
        </div>

        {/* EMPTY */}

        {quizzes.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
              <Brain
                size={28}
                className="text-violet-300"
              />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-white">
              No quizzes yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
              Generate your first AI-powered
              practice quiz from one of your
              courses.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quizzes.map((quiz) => {
              const course =
                courses.find(
                  (item) =>
                    item.id === quiz.course_id
                );

              return (
                <div
                  key={quiz.id}
                  className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-violet-400/25 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10">
                      <BookOpen
                        size={20}
                        className="text-violet-300"
                      />
                    </div>

                    <button
                      onClick={() =>
                        deleteQuiz(quiz.id)
                      }
                      className="rounded-lg p-2 text-white/25 transition hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-5">
                    <div className="text-xs font-medium text-violet-300">
                      {course?.code ||
                        "Course"}
                    </div>

                    <h2 className="mt-1 font-semibold text-white">
                      {quiz.title}
                    </h2>

                    <p className="mt-2 line-clamp-2 text-sm text-white/40">
                      {quiz.description}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/50">
                      {quiz.question_count}{" "}
                      questions
                    </span>

                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs capitalize text-white/50">
                      {quiz.difficulty}
                    </span>

                    {quiz.time_limit_minutes && (
                      <span className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/50">
                        <Clock3 size={12} />
                        {
                          quiz.time_limit_minutes
                        }{" "}
                        min
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      startQuiz(quiz.id)
                    }
                    className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-violet-400/30 hover:bg-violet-500/10"
                  >
                    Start quiz
                    <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GENERATOR MODAL */}

      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#110c1c] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-violet-300">
                  <Sparkles size={18} />
                  AI Quiz Generator
                </div>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  Create a practice quiz
                </h2>
              </div>

              <button
                onClick={() =>
                  setShowGenerator(false)
                }
                className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-white/50">
                  Course
                </label>

                <select
                  value={selectedCourse}
                  onChange={(event) =>
                    setSelectedCourse(
                      event.target.value
                    )
                  }
                  className="input"
                >
                  <option value="">
                    Select a course
                  </option>

                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.code} —{" "}
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-white/50">
                  Topic
                </label>

                <input
                  value={topic}
                  onChange={(event) =>
                    setTopic(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Derivatives, Thermodynamics..."
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-medium text-white/50">
                    Difficulty
                  </label>

                  <select
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    <option value="easy">
                      Easy
                    </option>
                    <option value="medium">
                      Medium
                    </option>
                    <option value="hard">
                      Hard
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-white/50">
                    Questions
                  </label>

                  <select
                    value={questionCount}
                    onChange={(event) =>
                      setQuestionCount(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="input"
                  >
                    <option value={5}>
                      5
                    </option>
                    <option value={10}>
                      10
                    </option>
                    <option value={15}>
                      15
                    </option>
                    <option value={20}>
                      20
                    </option>
                    <option value={30}>
                      30
                    </option>
                  </select>
                </div>
              </div>

              <button
                disabled={generating}
                onClick={generateQuiz}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Generating...
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
      )}

      {/* QUIZ MODAL */}

      {activeQuiz && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#080611]">
          <div className="mx-auto max-w-4xl px-5 py-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="text-sm text-violet-300">
                  {activeQuiz.quiz.difficulty}{" "}
                  practice quiz
                </div>

                <h1 className="mt-1 text-2xl font-semibold text-white">
                  {activeQuiz.quiz.title}
                </h1>
              </div>

              {!results && (
                <button
                  onClick={() =>
                    setActiveQuiz(null)
                  }
                  className="rounded-xl border border-white/10 p-3 text-white/50 hover:bg-white/5 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {!results ? (
              <>
                <div className="space-y-5">
                  {activeQuiz.questions.map(
                    (question, index) => (
                      <div
                        key={question.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
                      >
                        <div className="text-xs text-violet-300">
                          Question {index + 1} of{" "}
                          {
                            activeQuiz.questions
                              .length
                          }
                        </div>

                        <h2 className="mt-3 text-base font-medium leading-7 text-white">
                          {question.question}
                        </h2>

                        <div className="mt-5 space-y-2">
                          {question.question_type ===
                          "multiple_choice" ||
                          question.question_type ===
                            "true_false" ? (
                            (
                              question.options
                                .length
                                ? question.options
                                : [
                                    "True",
                                    "False",
                                  ]
                            ).map(
                              (option) => {
                                const selected =
                                  answers[
                                    question.id
                                  ] === option;

                                return (
                                  <button
                                    key={option}
                                    onClick={() =>
                                      setAnswers(
                                        (
                                          current
                                        ) => ({
                                          ...current,
                                          [question.id]:
                                            option,
                                        })
                                      )
                                    }
                                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                                      selected
                                        ? "border-violet-400/50 bg-violet-500/15 text-white"
                                        : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                        selected
                                          ? "border-violet-400 bg-violet-500"
                                          : "border-white/20"
                                      }`}
                                    >
                                      {selected && (
                                        <CheckCircle2
                                          size={
                                            13
                                          }
                                          className="text-white"
                                        />
                                      )}
                                    </span>

                                    {option}
                                  </button>
                                );
                              }
                            )
                          ) : (
                            <textarea
                              value={
                                answers[
                                  question.id
                                ] || ""
                              }
                              onChange={(event) =>
                                setAnswers(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    [question.id]:
                                      event.target
                                        .value,
                                  })
                                )
                              }
                              placeholder="Write your answer..."
                              className="input min-h-28 resize-y"
                            />
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>

                <button
                  onClick={submitQuiz}
                  disabled={submitting}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Grading...
                    </>
                  ) : (
                    "Submit quiz"
                  )}
                </button>
              </>
            ) : (
              <div className="space-y-5">
                <div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-8 text-center">
                  <div className="text-sm text-white/45">
                    Your score
                  </div>

                  <div className="mt-2 text-6xl font-bold text-white">
                    {results.percentage}%
                  </div>

                  <div className="mt-3 text-sm text-white/50">
                    {results.correctCount} /{" "}
                    {results.totalQuestions}{" "}
                    correct
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {results.topics.map(
                    (topic) => (
                      <div
                        key={topic.topic}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/70">
                            {topic.topic}
                          </span>

                          <span
                            className={`text-sm font-semibold ${
                              topic.percentage >=
                              70
                                ? "text-emerald-300"
                                : "text-amber-300"
                            }`}
                          >
                            {topic.percentage}%
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{
                              width: `${topic.percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="space-y-3">
                  {results.results.map(
                    (result, index) => (
                      <div
                        key={result.questionId}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                      >
                        <div className="flex gap-3">
                          <div
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                              result.isCorrect
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-red-500/15 text-red-300"
                            }`}
                          >
                            {result.isCorrect
                              ? "✓"
                              : "×"}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs text-white/35">
                              Question{" "}
                              {index + 1}
                            </div>

                            <p className="mt-1 text-sm leading-6 text-white/80">
                              {
                                result.question
                              }
                            </p>

                            {!result.isCorrect && (
                              <div className="mt-3 text-sm">
                                <span className="text-white/35">
                                  Correct:
                                </span>{" "}
                                <span className="text-emerald-300">
                                  {
                                    result.correctAnswer
                                  }
                                </span>
                              </div>
                            )}

                            {result.explanation && (
                              <p className="mt-3 text-xs leading-5 text-white/40">
                                {
                                  result.explanation
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <button
                  onClick={() => {
                    setActiveQuiz(null);
                    setResults(null);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
                >
                  Back to quizzes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}