"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle } from "lucide-react";
import { signupAction, type AuthFormState } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";
import { GoogleButton, OrDivider } from "./GoogleButton";
import { VerificationNotice } from "./VerificationNotice";

const initialState: AuthFormState = {};

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  // The account exists now but can't be used until the emailed link is followed.
  if (state.verificationEmail) {
    return <VerificationNotice email={state.verificationEmail} sent={!!state.verificationSent} />;
  }

  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <Field label={t("fullName")} htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" placeholder="Jamie Rivera" autoComplete="name" required />
      </Field>
      <Field label={t("email")} htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      </Field>
      <Field label={t("password")} htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" placeholder={t("passwordPlaceholder")} autoComplete="new-password" required />
      </Field>
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="mt-1 w-full">
        {pending ? t("creatingAccount") : t("createAccount")}
      </Button>
      {googleEnabled && (
        <>
          <OrDivider />
          <GoogleButton />
        </>
      )}
      <p className="text-center text-[13px] text-text-muted">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </form>
  );
}
