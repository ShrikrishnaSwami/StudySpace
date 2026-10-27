import "server-only";

import { createClient } from "@supabase/supabase-js";

export type AiFeature = "tutor" | "quiz" | "flashcards" | "homework" | "syllabus" | "recommendations";

export const AI_DAILY_LIMITS: Record<AiFeature, number> = {
  tutor: 40,
  quiz: 15,
  flashcards: 15,
  homework: 20,
  syllabus: 10,
  recommendations: 20,
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-side usage controls are not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function consumeAiQuota(userId: string, feature: AiFeature) {
  const limit = AI_DAILY_LIMITS[feature];
  const client = adminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error: countError } = await client
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", since);

  if (countError) throw new Error("Could not check AI usage: " + countError.message);
  const used = count || 0;
  const resetAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  if (used >= limit) return { allowed: false, limit, used, remaining: 0, resetAt };

  const { error: insertError } = await client.from("ai_usage_events").insert({ user_id: userId, feature });
  if (insertError) throw new Error("Could not record AI usage: " + insertError.message);
  return { allowed: true, limit, used: used + 1, remaining: Math.max(0, limit - used - 1), resetAt };
}

export async function getAiUsage(userId: string) {
  const client = adminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("ai_usage_events")
    .select("feature")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error("Could not load AI usage: " + error.message);
  const counts: Record<string, number> = {};
  for (const row of data || []) counts[row.feature] = (counts[row.feature] || 0) + 1;
  return Object.entries(AI_DAILY_LIMITS).map(([feature, limit]) => ({
    feature,
    limit,
    used: counts[feature] || 0,
    remaining: Math.max(0, limit - (counts[feature] || 0)),
  }));
}
