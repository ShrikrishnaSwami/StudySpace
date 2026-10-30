import { NextRequest, NextResponse } from "next/server";
import { consumeApiRateLimit, readBoundedJson } from "@/lib/api-security";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Sign in to join a group." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Supabase authentication is not configured." }, { status: 503 });
    }

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: "Bearer " + token } },
    });
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });
    }

    const rate = await consumeApiRateLimit(user.id, "study-group-join", 10, 600, token);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many join attempts. Please wait and try again." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await readBoundedJson(request, 1024);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "REQUEST_TOO_LARGE";
      return NextResponse.json({ error: tooLarge ? "Invite request is too large." : "Invalid invite request." }, { status: tooLarge ? 413 : 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid invite request." }, { status: 400 });
    }

    const rawCode = (body as { inviteCode?: unknown }).inviteCode;
    const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
    if (!/^(?:[A-Z0-9]{8}|[A-Z0-9]{16})$/.test(code)) {
      return NextResponse.json({ error: "Enter a valid invite code." }, { status: 400 });
    }

    const { data, error } = await client.rpc("join_study_group_by_invite", {
      p_invite_code: code,
    });
    if (error) {
      console.error("Study group join RPC failed:", { code: error.code });
      return NextResponse.json({ error: "Could not join the study group." }, { status: 500 });
    }

    const group = Array.isArray(data) ? data[0] : data;
    if (!group) {
      return NextResponse.json({ error: "No study group found for that code." }, { status: 404 });
    }

    return NextResponse.json({ group: { id: group.id, name: group.name } });
  } catch {
    console.error("Study group join failed.");
    return NextResponse.json({ error: "Could not join the study group." }, { status: 500 });
  }
}
