import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAal2Token, isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Supabase public authentication configuration is missing." }, { status: 503 });
  }

  // The public key is sufficient to verify a supplied user token; no privileged key is needed here.
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);

  if (error || !user) {
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

  return NextResponse.json(
    { authorized: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
