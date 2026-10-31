# StudySpace beta security setup

## Implemented in the application
- Account sign-up requires explicit Terms of Service and Privacy Policy acceptance.
- Sign-up includes a hidden honeypot field and a minimum interaction-time check.
- Cloudflare Turnstile can be rendered on the sign-up form when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is configured.
- The Turnstile response is passed to Supabase Auth as `captchaToken`.
- AI API routes reject Supabase anonymous users server-side.
- AI usage and database-backed request quotas remain enforced independently of the UI.
- Guest sign-in reuses the current anonymous session and can restore a saved guest session on the same browser after account sign-in.

## Required dashboard configuration for full bot protection
A managed Turnstile widget has been created in the connected Cloudflare account for `studyspace.wiki` and `localhost`. Its public site key is wired into the application. The matching secret is intentionally not stored in GitHub. Turnstile is not fully enforced until Supabase Auth's project-level CAPTCHA switch is enabled and that secret is configured there.

1. In Supabase Dashboard → Authentication → Bot and Abuse Protection, enable CAPTCHA protection, select Cloudflare Turnstile, and enter the secret key from the newly created Cloudflare widget. Never put the secret key in a `NEXT_PUBLIC_` variable or commit it.
2. The public site key is already configured in `src/lib/security-config.ts`; use `NEXT_PUBLIC_TURNSTILE_SITE_KEY` only if you need to override it for a separate preview widget.
3. Test sign-up and guest sign-in with a valid challenge, an expired challenge, and no token. Confirm Supabase rejects invalid/missing CAPTCHA tokens after the setting is enabled.
4. Review Supabase Auth rate limits, especially anonymous sign-ins, sign-ups, password resets and email OTP requests. Keep the built-in limits enabled.

## Important limitations
- Honeypots and timing checks are supplementary signals, not substitutes for CAPTCHA or server-side rate limits.
- CAPTCHA must be enabled in Supabase itself; rendering a Turnstile widget without configuring the Supabase secret does not provide authoritative protection.
- Guest recovery stores a refresh token in browser local storage. Treat the browser as a trusted device and avoid guest access on shared/public computers.
- Guest coursework remains stored against its anonymous Supabase user ID. The recovery token restores access; it is not an offline backup of coursework.
- Do not claim complete bot prevention. Continue monitoring abuse, auth volume, AI quotas and unexpected spend.
