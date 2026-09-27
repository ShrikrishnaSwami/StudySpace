import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
    nodeEnv: process.env.NODE_ENV,
  });
}