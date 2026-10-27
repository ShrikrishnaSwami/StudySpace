import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public liveness endpoint: deliberately does not reveal which providers,
// database credentials, or internal services are configured.
export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
