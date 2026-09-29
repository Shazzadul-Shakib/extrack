import { getTranslations } from "next-intl/server";
import { getAppUrl } from "./appUrl";
import { passwordFingerprint, signToken, verifyToken } from "./crypto";
import { sendEmail } from "./email";
import { findUserById, markResetPasswordSent } from "./users";
import type { User } from "./types";

const PURPOSE = "reset-password";
// Shorter-lived than an email-verification link: this one grants a password change, not just a
// confirmation, so a stale link sitting in an inbox is a bigger liability.
const TOKEN_TTL_MS = 60 * 60 * 1000;

/** How long a user must wait between reset emails — stops the form being used to spam an inbox. */
export const RESET_COOLDOWN_MS = 60 * 1000;

interface ResetPayload {
  userId: string;
  email: string;
  /** Ties the link to the password it was issued for — see `passwordFingerprint`. Using the link
   *  changes the password, which changes this fingerprint, so a link can never be replayed. */
  fp: string;
  exp: number;
}

/** Milliseconds until another reset email may be sent to this account (0 when it's free to send). */
export function resetCooldownRemaining(user: Pick<User, "resetPasswordSentAt">): number {
  if (!user.resetPasswordSentAt) return 0;
  const elapsed = Date.now() - new Date(user.resetPasswordSentAt).getTime();
  return Math.max(0, RESET_COOLDOWN_MS - elapsed);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Emails `user` a link to choose a new password. Resolves to whether the email was handed off —
 * never throws, so a misconfigured deployment doesn't crash the forgot-password form.
 */
export async function sendPasswordResetEmail(user: User, locale: string): Promise<boolean> {
  try {
    const payload: ResetPayload = {
      userId: user.id,
      email: user.email,
      fp: passwordFingerprint(user),
      exp: Date.now() + TOKEN_TTL_MS,
    };
    const token = signToken(payload as unknown as Record<string, unknown>, PURPOSE);
    const url = `${await getAppUrl()}/${locale}/reset-password?token=${encodeURIComponent(token)}`;

    const t = await getTranslations({ locale, namespace: "Email" });
    const firstName = user.name.split(" ")[0] || user.name;
    const greeting = t("resetGreeting", { name: firstName });
    const text = [greeting, "", t("resetBody"), "", url, "", t("resetExpires"), t("resetIgnore")].join("\n");
    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0b0b0b">
  <p style="font-size:16px;margin:0 0 12px">${escapeHtml(greeting)}</p>
  <p style="font-size:14px;line-height:1.5;margin:0 0 20px">${escapeHtml(t("resetBody"))}</p>
  <p style="margin:0 0 20px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1c3a5e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:8px">${escapeHtml(t("resetButton"))}</a></p>
  <p style="font-size:12.5px;color:#52514e;margin:0 0 4px">${escapeHtml(t("resetExpires"))}</p>
  <p style="font-size:12.5px;color:#52514e;margin:0">${escapeHtml(t("resetIgnore"))}</p>
</div>`;

    const sent = await sendEmail({ to: user.email, subject: t("resetSubject"), text, html });
    if (sent) await markResetPasswordSent(user.id);
    return sent;
  } catch (error) {
    console.error("[email] could not send password reset email:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Checks a reset link's token and, if it's genuine, unexpired and still matches the account's
 * current password, returns the account it was issued for. Returns null when the link is
 * invalid, stale, or already used (using it changes the password, which changes the fingerprint).
 */
export async function verifyPasswordResetToken(token: string | null | undefined): Promise<User | null> {
  const payload = verifyToken<ResetPayload>(token, PURPOSE);
  if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;

  const user = await findUserById(payload.userId);
  if (!user || user.email !== payload.email) return null;
  if (payload.fp !== passwordFingerprint(user)) return null;
  return user;
}
