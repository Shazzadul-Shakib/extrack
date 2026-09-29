"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createSessionCookie, clearSessionCookie } from "@/lib/session";
import { authenticate, createUser, findUserByEmail, resetPassword, resetUnverifiedUser } from "@/lib/users";
import { createStarterWallets } from "@/lib/onboarding";
import { sendVerificationEmail, verificationCooldownRemaining } from "@/lib/emailVerification";
import { resetCooldownRemaining, sendPasswordResetEmail, verifyPasswordResetToken } from "@/lib/passwordReset";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set after a signup: the address a verification link was (or should have been) sent to. */
  verificationEmail?: string;
  /** Whether that verification email actually went out — false shows a "couldn't send, try again" notice instead. */
  verificationSent?: boolean;
  /** Set when a login was refused only because the address isn't verified yet — offers a resend. */
  unverifiedEmail?: string;
}

export interface ResendState {
  sent?: boolean;
  error?: string;
}

export interface ForgotPasswordState {
  sent?: boolean;
}

export interface ResetPasswordState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** The link was invalid, expired, or already used — the form gives up instead of retrying with a stale token. */
  invalidLink?: boolean;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signupAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = str(formData, "name");
  const email = str(formData, "email");
  const password = str(formData, "password");
  const t = await getTranslations("Auth.errors");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = t("nameRequired");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = t("emailInvalid");
  if (password.length < 8) fieldErrors.password = t("passwordTooShort");
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  let user;
  try {
    const existing = await findUserByEmail(email);
    if (existing && !existing.emailVerifiedAt && existing.passwordHash) {
      // Someone signed up with this address but never confirmed it. The newest signup wins, so
      // whoever typed the address first can't hold it hostage — but throttled, so this form
      // can't be used to flood an inbox either.
      const wait = verificationCooldownRemaining(existing);
      if (wait > 0) return { error: t("resendWait", { seconds: Math.ceil(wait / 1000) }) };
      user = await resetUnverifiedUser(existing.id, { name, password });
    } else {
      user = await createUser({ name, email, password });
      await createStarterWallets(user.id);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : t("createAccountFailed") };
  }

  // No session yet: the account can't be used until the emailed link confirms the address.
  const sent = await sendVerificationEmail(user, await getLocale());
  return { verificationEmail: user.email, verificationSent: sent };
}

export async function loginAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = str(formData, "email");
  const password = str(formData, "password");
  const t = await getTranslations("Auth.errors");

  if (!email || !password) return { error: t("emailPasswordRequired") };

  const result = await authenticate(email, password);
  if (result.status === "invalid") return { error: t("invalidCredentials") };
  if (result.status === "google_only") return { error: t("googleOnly") };
  if (result.status === "unverified") return { error: t("emailNotVerified"), unverifiedEmail: result.user.email };

  await createSessionCookie(result.user.id);
  redirect({ href: "/dashboard", locale: await getLocale() });
  throw new Error("unreachable");
}

/** Sends a fresh verification link. Answers the same way whether or not the address has an account that needs one. */
export async function resendVerificationAction(_prevState: ResendState, formData: FormData): Promise<ResendState> {
  const email = str(formData, "email");
  const t = await getTranslations("Auth.errors");

  const user = email ? await findUserByEmail(email) : null;
  if (user && !user.emailVerifiedAt && user.passwordHash && verificationCooldownRemaining(user) === 0) {
    const sent = await sendVerificationEmail(user, await getLocale());
    if (!sent) return { error: t("emailSendFailed") };
  }
  return { sent: true };
}

/** Sends a password reset link. Answers the same way whether or not the address has a password account, so the form can't be used to test which emails are registered. */
export async function forgotPasswordAction(_prevState: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = str(formData, "email");

  const user = email ? await findUserByEmail(email) : null;
  // Google-only accounts have no password to reset, and skipping them here keeps a reset link
  // from ever being usable to bolt a password onto an account the owner never asked to have one.
  if (user && user.passwordHash && resetCooldownRemaining(user) === 0) {
    await sendPasswordResetEmail(user, await getLocale());
  }
  return { sent: true };
}

export async function resetPasswordAction(_prevState: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const token = str(formData, "token");
  const password = str(formData, "password");
  const confirmPassword = str(formData, "confirmPassword");
  const t = await getTranslations("Auth.errors");

  const fieldErrors: Record<string, string> = {};
  if (password.length < 8) fieldErrors.password = t("passwordTooShort");
  else if (password !== confirmPassword) fieldErrors.confirmPassword = t("passwordMismatch");
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Re-checked here, not just when the page loaded: the link can expire, or get used in another
  // tab, in the time it takes to fill in the form.
  const user = await verifyPasswordResetToken(token);
  if (!user) return { invalidLink: true };

  await resetPassword(user, password);
  redirect({ href: { pathname: "/login", query: { reset: "1" } }, locale: await getLocale() });
  throw new Error("unreachable");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect({ href: "/login", locale: await getLocale() });
}
