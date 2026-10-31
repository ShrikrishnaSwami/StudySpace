import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function safeNext(value: string | null, origin: string) {
  if (!value) return "/dashboard";
  try {
    const candidate = new URL(value, origin);
    if (
      candidate.origin === origin &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.startsWith("/\\\\")
    ) {
      return candidate.pathname + candidate.search + candidate.hash;
    }
  } catch {
    // Fall through to the safe default.
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), url.origin);

  if ((!tokenHash || tokenHash.length > 2048) && (!code || code.length > 2048)) {
    return NextResponse.redirect(new URL("/login?error=email_confirmation", url.origin));
  }

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

  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
    : await supabase.auth.exchangeCodeForSession(code!);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=email_confirmation", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
