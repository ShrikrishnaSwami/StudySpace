import { supabase } from "@/lib/supabase";

export type RecommendationPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export type RecommendationSource =
  | "ai"
  | "system"
  | "quiz"
  | "assignment"
  | "calendar";

export type StudyRecommendation = {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  recommendation: string;
  reason: string;
  priority: RecommendationPriority;
  estimated_minutes: number | null;
  suggested_date: string | null;
  source: RecommendationSource;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export async function getStudyRecommendations(
  limit = 20
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("study_recommendations")
    .select("*")
    .eq("user_id", user.id)
    .order("completed", {
      ascending: true,
    })
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as StudyRecommendation[];
}

export async function completeStudyRecommendation(
  id: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("study_recommendations")
    .update({
      completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as StudyRecommendation;
}

export async function deleteStudyRecommendation(
  id: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { error } = await supabase
    .from("study_recommendations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}