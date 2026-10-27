import { NextRequest, NextResponse } from "next/server";

const MAX_API_BODY_BYTES = 8 * 1024 * 1024;

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

export function middleware(request: NextRequest) {
  const method = request.method.toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const origin = request.headers.get("origin");

  if (isMutation && origin && !allowedOrigin(origin, request)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_API_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
