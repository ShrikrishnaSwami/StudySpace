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
  const { data, error } = await adminClient().rpc("consume_ai_quota", {
    p_user_id: userId,
    p_feature: feature,
    p_limit: limit,
  });
  if (error) {
    console.error("Atomic AI quota check failed", { feature, code: error.code });
    throw new Error("AI usage controls are temporarily unavailable. Please try again.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("AI usage controls returned no result.");
  return {
    allowed: Boolean(row.allowed),
    limit: Number(row.limit_count ?? limit),
    used: Number(row.used ?? 0),
    remaining: Number(row.remaining ?? 0),
    resetAt: row.reset_at ? new Date(row.reset_at).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getAiUsage(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await adminClient()
    .from("ai_usage_events")
    .select("feature")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) {
    console.error("AI usage read failed", { code: error.code });
    throw new Error("Could not load AI usage.");
  }
  const counts: Record<string, number> = {};
  for (const row of data || []) counts[row.feature] = (counts[row.feature] || 0) + 1;
  return Object.entries(AI_DAILY_LIMITS).map(([feature, limit]) => ({
    feature,
    limit,
    used: counts[feature] || 0,
    remaining: Math.max(0, limit - (counts[feature] || 0)),
  }));
}
