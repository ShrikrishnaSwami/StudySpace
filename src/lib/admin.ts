import "server-only";

/**
 * Supabase's generated UserAppMetadata type is intentionally open-ended.
 * Accept it as unknown here and narrow the trusted role claim at runtime.
 * Never use user_metadata for authorization because users can edit it.
 */
export function isAdminUser(user?: { app_metadata?: unknown } | null): boolean {
  const metadata = user?.app_metadata;
  if (typeof metadata !== "object" || metadata === null) return false;
  return "role" in metadata && (metadata as { role?: unknown }).role === "admin";
}


/**
 * Call only after Supabase Auth has validated this token with getUser(token).
 * The AAL claim is read from that validated JWT to require a second factor
 * for sensitive administrator operations.
 */
export function hasAal2Token(token: string): boolean {
  const payloadPart = token.split(".")[1];
  if (!payloadPart) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as { aal?: unknown };
    return payload.aal === "aal2";
  } catch {
    return false;
  }
}
