/**
 * Admin access is granted by listing an email in the ADMIN_EMAILS environment variable
 * (comma-separated) rather than by a flag in the database — there's no way to become an admin
 * by writing to a user row or through the app, and revoking access is just an env change.
 *
 * The caller must also require the account's email to be verified; otherwise anyone could sign
 * up with an admin's address and claim the role before its owner does.
 */
export function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

export function isAdminUser(user: { email: string; emailVerifiedAt: string | null }): boolean {
  return !!user.emailVerifiedAt && isAdminEmail(user.email);
}
