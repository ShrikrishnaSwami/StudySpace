import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") || "/dashboard";
  let next = "/dashboard";
  try {
    const candidate = new URL(requestedNext, url.origin);
    // Only allow same-origin relative destinations. Backslash-prefixed paths can
    // be normalized by URL parsers, so checking the resolved origin is essential.
    if (
      requestedNext.startsWith("/") &&
      !requestedNext.startsWith("//") &&
      !requestedNext.startsWith("/\\") &&
      candidate.origin === url.origin
    ) {
      next = candidate.pathname + candidate.search + candidate.hash;
    }
  } catch {
    next = "/dashboard";
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth_callback", url.origin));
}
