import { supabase } from "@/lib/supabase";

export type QuizDifficulty =
  | "easy"
  | "medium"
  | "hard";

export type QuizQuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer";

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  question_order: number;
  question: string;
  question_type: QuizQuestionType;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
  points: number;
  created_at: string;
};

export type Quiz = {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  description: string;
  difficulty: QuizDifficulty;
  question_count: number;
  time_limit_minutes: number | null;
  source: "manual" | "ai" | "course";
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
};

export async function getQuizzes(courseId?: string) {
  let query = supabase
    .from("quizzes")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Quiz[];
}

export async function getQuiz(id: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Quiz;
}

export async function getQuizQuestions(
  quizId: string
) {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("question_order", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as QuizQuestion[];
}

export async function deleteQuiz(id: string) {
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createQuiz(
  quiz: Omit<
    Quiz,
    | "id"
    | "user_id"
    | "created_at"
    | "updated_at"
  >
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      ...quiz,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Quiz;
}

export async function createQuizQuestions(
  quizId: string,
  questions: Array<{
    question_order: number;
    question: string;
    question_type: QuizQuestionType;
    options: string[];
    correct_answer: string;
    explanation?: string;
    topic?: string;
    points?: number;
  }>
) {
  const payload = questions.map((question) => ({
    quiz_id: quizId,
    question_order: question.question_order,
    question: question.question,
    question_type: question.question_type,
    options: question.options,
    correct_answer: question.correct_answer,
    explanation: question.explanation || "",
    topic: question.topic || "",
    points: question.points || 1,
  }));

  const { data, error } = await supabase
    .from("quiz_questions")
    .insert(payload)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data as QuizQuestion[];
}