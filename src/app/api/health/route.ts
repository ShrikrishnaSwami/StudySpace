import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    supabasePublicConfig: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServerConfig: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    geminiConfig: Boolean(process.env.GEMINI_API_KEY),
    database: false,
  };

  if (checks.supabaseServerConfig) {
    try {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
      );
      const { error } = await client.from("ai_usage_events").select("id", { head: true, count: "exact" });
      checks.database = !error;
    } catch {
      checks.database = false;
    }
  }

  const ready = checks.supabasePublicConfig && checks.supabaseServerConfig && checks.geminiConfig && checks.database;
  return NextResponse.json(
    { status: ready ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
