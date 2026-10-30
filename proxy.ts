import { NextRequest, NextResponse } from "next/server";

const MAX_API_BODY_BYTES = 16 * 1024 * 1024;

function allowedOrigin(origin: string, request: NextRequest) {
  if (origin === request.nextUrl.origin) return true;

  const configured = process.env.APP_ORIGIN?.trim();
  if (configured && origin === configured.replace(/\/$/, "")) return true;

  if (origin === "https://studyspace.wiki" || origin === "https://www.studyspace.wiki") return true;

  const deploymentHost = process.env.VERCEL_URL;
  if (deploymentHost && origin === "https://" + deploymentHost) return true;

  if (process.env.NODE_ENV !== "production") {
    try {
      const parsed = new URL(origin);
      return parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    } catch {
      return false;
    }
  }

  return false;
}

export function proxy(request: NextRequest) {
  const method = request.method.toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const origin = request.headers.get("origin");

  if (isMutation && origin && !allowedOrigin(origin, request)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\\d+$/.test(declaredLength)) {
      return NextResponse.json({ error: "Invalid request length." }, { status: 400 });
    }
    if (Number(declaredLength) > MAX_API_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
  }
  // Routes enforce their own streamed limits. This proxy check is only an
  // early global ceiling; missing Content-Length is never treated as zero.

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
