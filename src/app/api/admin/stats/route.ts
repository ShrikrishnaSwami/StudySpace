import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "Supabase public authentication configuration is missing." },
        { status: 503 },
      );
    }

    // The caller's JWT is passed to both Auth and the restricted statistics RPC.
    // Never use a service-role key for browser-originated administrator requests.
    const client = createClient(url, key, {
      global: { headers: { Authorization: \`Bearer \${token}\` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Session invalid. Sign in again." }, { status: 401 });
    }
    if (!user.email_confirmed_at || !isAdminUser(user)) {
      return NextResponse.json({ error: "Verified administrator access required." }, { status: 403 });
    }

    const { data, error } = await client.rpc("admin_dashboard_stats");
    if (error) {
      if (error.code === "42501") {
        return NextResponse.json({ error: "Verified administrator access required." }, { status: 403 });
      }
      console.error("Admin statistics RPC failed:", error.message);
      return NextResponse.json({ error: "Could not load admin statistics." }, { status: 500 });
    }

    return NextResponse.json(
      {
        totalUsers: Number(data?.totalUsers) || 0,
        aiRequests24h: Number(data?.aiRequests24h) || 0,
        aiFeedback7d: Number(data?.aiFeedback7d) || 0,
        aiHelpful7d: Number(data?.aiHelpful7d) || 0,
        aiUnhelpful7d: Number(data?.aiUnhelpful7d) || 0,
        generatedAt: data?.generatedAt || new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin overview failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not load admin statistics." }, { status: 500 });
  }
}
