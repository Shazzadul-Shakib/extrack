import { getTranslations } from "next-intl/server";
import { getAppUrl } from "./appUrl";
import { passwordFingerprint, signToken, verifyToken } from "./crypto";
import { sendEmail } from "./email";
import { findUserById, markEmailVerified, markVerificationSent } from "./users";
import type { User } from "./types";

const PURPOSE = "verify-email";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** How long a user must wait between verification emails — stops the form being used to spam an inbox. */
export const VERIFICATION_COOLDOWN_MS = 60 * 1000;

interface VerificationPayload {
  userId: string;
  email: string;
  /** Ties the link to the credentials it was issued for — see `passwordFingerprint`. A repeat
   *  signup that replaces the password on an unverified account invalidates links emailed for
   *  the old one, since confirming an address must never adopt credentials the confirmer never saw. */
  fp: string;
  exp: number;
}

/** Milliseconds until another verification email may be sent to this account (0 when it's free to send). */
export function verificationCooldownRemaining(user: Pick<User, "verificationSentAt">): number {
  if (!user.verificationSentAt) return 0;
  const elapsed = Date.now() - new Date(user.verificationSentAt).getTime();
  return Math.max(0, VERIFICATION_COOLDOWN_MS - elapsed);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Emails `user` a link to confirm their address. Resolves to whether the email was handed off —
 * never throws, so a misconfigured deployment (no APP_URL, no email provider) shows the user a
 * "couldn't send" notice with a resend button instead of a crashed signup.
 */
export async function sendVerificationEmail(user: User, locale: string): Promise<boolean> {
  try {
    const payload: VerificationPayload = {
      userId: user.id,
      email: user.email,
      fp: passwordFingerprint(user),
      exp: Date.now() + TOKEN_TTL_MS,
    };
    const token = signToken(payload as unknown as Record<string, unknown>, PURPOSE);
    const url = `${await getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}&locale=${encodeURIComponent(locale)}`;

    const t = await getTranslations({ locale, namespace: "Email" });
    const firstName = user.name.split(" ")[0] || user.name;
    const greeting = t("verifyGreeting", { name: firstName });
    const text = [greeting, "", t("verifyBody"), "", url, "", t("verifyExpires"), t("verifyIgnore")].join("\n");
    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0b0b0b">
  <p style="font-size:16px;margin:0 0 12px">${escapeHtml(greeting)}</p>
  <p style="font-size:14px;line-height:1.5;margin:0 0 20px">${escapeHtml(t("verifyBody"))}</p>
  <p style="margin:0 0 20px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1c3a5e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:8px">${escapeHtml(t("verifyButton"))}</a></p>
  <p style="font-size:12.5px;color:#52514e;margin:0 0 4px">${escapeHtml(t("verifyExpires"))}</p>
  <p style="font-size:12.5px;color:#52514e;margin:0">${escapeHtml(t("verifyIgnore"))}</p>
</div>`;

    const sent = await sendEmail({ to: user.email, subject: t("verifySubject"), text, html });
    if (sent) await markVerificationSent(user.id);
    return sent;
  } catch (error) {
    console.error("[email] could not send verification email:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Checks a link's token and, if it's genuine, unexpired and still matches the account's current
 * credentials, marks the address verified. Idempotent — following the link twice is fine.
 * Returns the verified user, or null when the link is invalid or stale.
 */
export async function confirmVerificationToken(token: string | null | undefined): Promise<User | null> {
  const payload = verifyToken<VerificationPayload>(token, PURPOSE);
  if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;

  const user = await findUserById(payload.userId);
  if (!user || user.email !== payload.email) return null;
  if (user.emailVerifiedAt) return user;
  if (payload.fp !== passwordFingerprint(user)) return null;
  return markEmailVerified(user.id);
}
