"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";
import { GoogleButton, OrDivider } from "./GoogleButton";
import { ResendVerification } from "./ResendVerification";

const initialState: AuthFormState = {};

const DEMO_EMAIL = "astro@gmail.com";
const DEMO_PASSWORD = "12345678";

/** What the login page's `?verified` / `?reset` / `?error` query params mean, decided by the page. */
export type LoginNotice = "verified" | "reset" | "verify_error" | "google_error" | "google_conflict" | "google_unavailable";

const SUCCESS_NOTICES: LoginNotice[] = ["verified", "reset"];

export function LoginForm({ googleEnabled, notice }: { googleEnabled: boolean; notice?: LoginNotice }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function handleDemoLogin() {
    if (emailRef.current) emailRef.current.value = DEMO_EMAIL;
    if (passwordRef.current) passwordRef.current.value = DEMO_PASSWORD;
    formRef.current?.requestSubmit();
  }

  const noticeMessage: Record<LoginNotice, string> = {
    verified: t("notices.verified"),
    reset: t("notices.reset"),
    verify_error: t("notices.verifyError"),
    google_error: t("notices.googleError"),
    google_conflict: t("notices.googleConflict"),
    google_unavailable: t("notices.googleUnavailable"),
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        action={formAction}
        noValidate
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {notice &&
          (SUCCESS_NOTICES.includes(notice) ? (
            <p role="status" className="flex items-start gap-2 rounded-lg bg-status-good-soft px-3 py-2 text-[13px] text-status-good">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              {noticeMessage[notice]}
            </p>
          ) : (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              {noticeMessage[notice]}
            </p>
          ))}
        <Field label={t("email")} htmlFor="email">
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!state.error}
            required
          />
        </Field>
        <Field
          label={
            <span className="flex items-center justify-between gap-2">
              {t("password")}
              <Link href="/forgot-password" className="font-medium text-brand hover:underline">
                {t("forgotPasswordLink")}
              </Link>
            </span>
          }
          htmlFor="password"
        >
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!state.error}
            required
          />
        </Field>
        {state.error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {state.error}
          </p>
        )}
        <Button type="submit" loading={pending} className="mt-1 w-full">
          {pending ? t("signingIn") : t("signIn")}
        </Button>
        {googleEnabled && (
          <>
            <OrDivider />
            <GoogleButton />
          </>
        )}
        <Button type="button" variant="secondary" onClick={handleDemoLogin} disabled={pending} className="w-full">
          {t("tryDemo")}
        </Button>
        <p className="text-center text-[13px] text-text-muted">
          {t("newHere")}{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            {t("createAccountLink")}
          </Link>
        </p>
      </form>

      {/* Outside the login <form> — forms can't nest. */}
      {state.unverifiedEmail && (
        <div className="rounded-lg border border-border bg-surface p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="mb-3 text-[13px] text-text-secondary">{t("unverifiedHelp", { email: state.unverifiedEmail })}</p>
          <ResendVerification email={state.unverifiedEmail} />
        </div>
      )}
    </div>
  );
}
