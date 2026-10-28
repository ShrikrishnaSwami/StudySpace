import "server-only";

type AdminRoleSource = {
  app_metadata?: {
    role?: unknown;
  } | null;
};

/**
 * Admin access is granted only by a server-managed Supabase app_metadata claim.
 * Do not use user_metadata: users can edit it themselves.
 */
export function isAdminUser(user?: AdminRoleSource | null) {
  return user?.app_metadata?.role === "admin";
}
