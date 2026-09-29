"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MailCheck } from "lucide-react";
import { forgotPasswordAction, type ForgotPasswordState } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

const initialState: ForgotPasswordState = {};

/** The "forgot your password?" form: emails a reset link, then swaps to a generic "check your inbox" notice. */
export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  // Deliberately the same notice whether or not the address has an account — see forgotPasswordAction.
  if (state.sent) {
    return (
      <div
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 text-center"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <MailCheck className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-text-primary">{t("resetLinkSentTitle")}</h2>
          <p className="text-[13.5px] text-text-secondary">{t("resetLinkSentDesc")}</p>
        </div>
        <p className="text-[13px] text-text-muted">
          <Link href="/login" className="font-medium text-brand hover:underline">
            {t("backToSignIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-[13.5px] text-text-secondary">{t("forgotPasswordDescription")}</p>
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      </Field>
      <Button type="submit" loading={pending} className="mt-1 w-full">
        {pending ? t("sendingResetLink") : t("sendResetLink")}
      </Button>
      <p className="text-center text-[13px] text-text-muted">
        <Link href="/login" className="font-medium text-brand hover:underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
