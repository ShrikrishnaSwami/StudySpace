import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const MAX_API_BODY_BYTES = 4_400_000;
const PUBLIC_PATHS = ["/", "/login", "/signup", "/terms", "/privacy", "/auth/callback", "/reset-password"];

function allowedOrigin(origin: string, request: NextRequest) {
  if (origin === request.nextUrl.origin) return true;
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured && origin === configured.replace(/\\/$/, "")) return true;
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const method = request.method.toUpperCase();

  if (isApi) {
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

    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
  }

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    /\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse("Authentication service is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Validate the session with Supabase. A cookie's mere presence is not proof
  // of authentication. Anonymous users are allowed as isolated guest accounts.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)"],
};
