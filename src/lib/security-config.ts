// Public Turnstile site key. The matching secret must be configured in Supabase Auth.
// NEXT_PUBLIC_ override is useful for preview/testing widgets.
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAFuPioWbZG_4hsC-";
