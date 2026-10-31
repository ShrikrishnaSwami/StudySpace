import { NextRequest, NextResponse } from "next/server";
import { consumeApiRateLimit } from "@/lib/api-security";
import { createClient } from "@supabase/supabase-js";
import { getAiUsage } from "@/lib/api-security";
import { isAdminUser } from "@/lib/admin";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Supabase configuration is missing." }, { status: 503 });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    const rate = await consumeApiRateLimit(user.id, "usage-read", 120, 3600, token);
    if (!rate.allowed) return NextResponse.json({ error: "Too many usage requests. Please wait and try again." }, { status: 429 });

    return NextResponse.json({ admin: isAdminUser(user), usage: isAdminUser(user) ? [] : await getAiUsage(token), windowHours: 24 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("AI usage request failed.");
    return NextResponse.json({ error: "Could not load AI usage right now. Please try again shortly." }, { status: 503 });
  }
}
