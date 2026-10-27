import { NextRequest, NextResponse } from "next/server";
import { consumeApiRateLimit } from "@/lib/api-security";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Admin authentication is not configured." }, { status: 503 });

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Session invalid." }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const rate = await consumeApiRateLimit(user.id, "admin-check", 240, 3600);
  if (!rate.allowed) return NextResponse.json({ error: "Too many admin checks. Please wait and try again." }, { status: 429 });

  return NextResponse.json({ authorized: true }, { headers: { "Cache-Control": "no-store" } });
}
