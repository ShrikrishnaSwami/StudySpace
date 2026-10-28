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
