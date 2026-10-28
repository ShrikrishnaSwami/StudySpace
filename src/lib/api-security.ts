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

const AI_BURST_LIMITS: Record<AiFeature, number> = {
  tutor: 8,
  quiz: 4,
  flashcards: 4,
  homework: 4,
  syllabus: 3,
  recommendations: 3,
};

function publicClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public authentication configuration is missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: "Bearer " + accessToken } },
  });
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Server-side Supabase admin key is missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Quotas are consumed through JWT-bound RPCs. The database derives the user
 * identity from auth.uid(), so this path does not need a service-role secret.
 * Each feature has both a short burst cap and a rolling 24-hour spending cap.
 */
export async function consumeAiQuota(accessToken: string, feature: AiFeature) {
  const client = publicClient(accessToken);
  const burst = await client.rpc("consume_my_api_rate_limit", {
    p_route_key: "ai-" + feature,
    p_limit: AI_BURST_LIMITS[feature],
    p_window_seconds: 600,
  });

  if (burst.error) {
    console.error("AI burst limit check failed", { feature, code: burst.error.code });
    throw new Error("AI usage controls are temporarily unavailable. Please try again.");
  }

  const burstRow = Array.isArray(burst.data) ? burst.data[0] : burst.data;
  if (!burstRow) throw new Error("AI burst limit returned no result.");
  if (!burstRow.allowed) {
    return {
      allowed: false,
      limit: AI_BURST_LIMITS[feature],
      used: Number(burstRow.used ?? AI_BURST_LIMITS[feature]),
      remaining: 0,
      resetAt: burstRow.reset_at ? new Date(burstRow.reset_at).toISOString() : new Date(Date.now() + 600_000).toISOString(),
      scope: "rate" as const,
    };
  }

  const { data, error } = await client.rpc("consume_ai_quota_for_user", {
    p_feature: feature,
  });
  if (error) {
    console.error("Atomic AI quota check failed", { feature, code: error.code });
    throw new Error("AI usage controls are temporarily unavailable. Please try again.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("AI usage controls returned no result.");
  return {
    allowed: Boolean(row.allowed),
    limit: Number(row.limit_count ?? AI_DAILY_LIMITS[feature]),
    used: Number(row.used ?? 0),
    remaining: Number(row.remaining ?? 0),
    resetAt: row.reset_at ? new Date(row.reset_at).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    scope: row.scope === "global" ? "global" as const : "user" as const,
  };
}

export async function getAiUsage(accessToken: string) {
  const { data, error } = await publicClient(accessToken).rpc("get_my_ai_usage");
  if (error) {
    console.error("AI usage read failed", { code: error.code });
    throw new Error("Could not load AI usage.");
  }
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => ({
    feature: String(row.feature),
    limit: Number(row.limit_count),
    used: Number(row.used),
    remaining: Number(row.remaining),
  }));
}

/**
 * Generic rate limiting for trusted server-only routes. Pass an access token
 * when available to use the safer caller-bound RPC without a service-role key.
 */
export async function consumeApiRateLimit(
  userId: string,
  routeKey: string,
  limit = 120,
  windowSeconds = 600,
  accessToken?: string,
) {
  const result = accessToken
    ? await publicClient(accessToken).rpc("consume_my_api_rate_limit", {
        p_route_key: routeKey,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      })
    : await adminClient().rpc("consume_api_rate_limit", {
        p_user_id: userId,
        p_route_key: routeKey,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
  const { data, error } = result;
  if (error) {
    console.error("API rate limit check failed", { routeKey, code: error.code });
    throw new Error("Request protection is temporarily unavailable.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Request protection returned no result.");
  return {
    allowed: Boolean(row.allowed),
    used: Number(row.used ?? 0),
    remaining: Number(row.remaining ?? 0),
    resetAt: row.reset_at ? new Date(row.reset_at).toISOString() : new Date(Date.now() + windowSeconds * 1000).toISOString(),
  };
}
