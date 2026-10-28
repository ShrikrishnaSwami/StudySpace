import { NextRequest, NextResponse } from "next/server";
import { consumeApiRateLimit } from "@/lib/api-security";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (!url || !serviceKey) return NextResponse.json({ error: "Server-side Supabase admin configuration is missing." }, { status: 503 });

    const client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Session invalid. Sign in again." }, { status: 401 });
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

    const rate = await consumeApiRateLimit(user.id, "admin-stats", 180, 3600);
    if (!rate.allowed) return NextResponse.json({ error: "Too many statistics requests. Please wait and try again." }, { status: 429 });

    let totalUsers = 0;
    let page = 1;
    while (true) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const count = data?.users?.length ?? 0;
      totalUsers += count;
      if (count < 1000) break;
      page += 1;
    }

    const since24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [coursesResult, assignmentsResult, submissionsResult, aiRequestsResult] = await Promise.all([
      client.from("courses").select("id", { count: "exact", head: true }),
      client.from("assignments").select("id", { count: "exact", head: true }),
      client.from("assignment_submissions").select("id", { count: "exact", head: true }),
      client.from("ai_usage_events").select("id", { count: "exact", head: true }).gte("created_at", since24Hours),
    ]);
    const queryError = coursesResult.error || assignmentsResult.error || submissionsResult.error || aiRequestsResult.error;
    if (queryError) throw queryError;

    return NextResponse.json(
      {
        totalUsers,
        courses: coursesResult.count ?? 0,
        assignments: assignmentsResult.count ?? 0,
        submissions: submissionsResult.count ?? 0,
        aiRequests24h: aiRequestsResult.count ?? 0,
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin overview failed:", error);
    return NextResponse.json({ error: "Could not load admin statistics." }, { status: 500 });
  }
}
