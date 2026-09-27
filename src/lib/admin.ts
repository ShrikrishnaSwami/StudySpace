export const ADMIN_EMAILS = [
  "apha9213@gmail.com",
];

export function isAdminEmail(email?: string | null) {
  if (!email) return false;

  return ADMIN_EMAILS.some(
    (adminEmail) =>
      adminEmail.toLowerCase() === email.toLowerCase()
  );
}