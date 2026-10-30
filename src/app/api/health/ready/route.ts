import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Readiness check for uptime monitoring. It verifies that the application can
 * reach its database without returning credentials, user data, or provider
 * configuration to the caller. Keep /api/health as a dependency-free liveness
 * check for platform probes.
 */
export async function GET() {
  const startedAt = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { status: "not_ready", checks: { database: "not_configured" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from("courses").select("id").limit(1);
    if (error) throw error;

    return NextResponse.json(
      { status: "ready", checks: { database: "ok" }, durationMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("StudySpace readiness check failed", { durationMs: Date.now() - startedAt });
    return NextResponse.json(
      { status: "not_ready", checks: { database: "unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
