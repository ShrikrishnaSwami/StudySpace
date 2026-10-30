import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAal2Token, isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publicKey) {
      return NextResponse.json({ error: "Supabase public authentication configuration is missing." }, { status: 503 });
    }

    const authClient = createClient(url, publicKey, {
      global: { headers: { Authorization: "Bearer " + token } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Session invalid. Sign in again." }, { status: 401 });
    }
    if (!user.email_confirmed_at || !isAdminUser(user)) {
      return NextResponse.json({ error: "Verified administrator access required." }, { status: 403 });
    }

    if (!hasAal2Token(token)) {
      return NextResponse.json({
        error: "Administrator multi-factor authentication is required. Enable an authenticator in Settings.",
        code: "MFA_REQUIRED",
      }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!serviceKey) {
      return NextResponse.json({
        configured: false,
        status: "not_configured",
        message: "Server-side Supabase admin key is missing. Backup status cannot be read yet.",
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await adminClient
      .from("system_backup_status")
      .select("status, started_at, completed_at, run_id, run_url, manifest, updated_at")
      .eq("id", true)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        return NextResponse.json({
          configured: false,
          status: "not_configured",
          message: "Backup status migration has not been applied yet.",
        }, { headers: { "Cache-Control": "no-store" } });
      }
      console.error("Admin backup status read failed:", error.message);
      return NextResponse.json({ error: "Could not load backup status." }, { status: 500 });
    }

    return NextResponse.json({
      configured: Boolean(data),
      status: data?.status || "not_configured",
      startedAt: data?.started_at || null,
      completedAt: data?.completed_at || null,
      runId: data?.run_id || null,
      runUrl: data?.run_url || null,
      manifest: data?.manifest || {},
      updatedAt: data?.updated_at || null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin backup status failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not load backup status." }, { status: 500 });
  }
}
