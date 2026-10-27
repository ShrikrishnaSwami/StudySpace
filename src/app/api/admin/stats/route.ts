import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.STUDYSPACE_ADMIN_EMAIL || "apha9213@gmail.com").trim().toLowerCase();

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (!url || !serviceKey) return NextResponse.json({ error: "Server-side Supabase admin configuration is missing." }, { status: 503 });

    const client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Session invalid. Sign in again." }, { status: 401 });
    if (!user.email || user.email.trim().toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

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

    return NextResponse.json(
      { totalUsers, generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin user count failed:", error);
    return NextResponse.json({ error: "Could not load total users." }, { status: 500 });
  }
}
