import "server-only";

export function isAdminEmail(email?: string | null) {
  const configured = process.env.STUDYSPACE_ADMIN_EMAIL?.trim().toLowerCase();
  const adminEmail = configured || "apha9213@gmail.com";
  return Boolean(email && email.trim().toLowerCase() === adminEmail);
}
