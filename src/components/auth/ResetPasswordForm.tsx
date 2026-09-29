"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle } from "lucide-react";
import { resetPasswordAction, type ResetPasswordState } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

const initialState: ResetPasswordState = {};

/** Sets a new password for a validated reset link. `token` comes from the page, which already checked it once. */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <input type="hidden" name="token" value={token} />
      <Field label={t("newPassword")} htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" placeholder={t("passwordPlaceholder")} autoComplete="new-password" required />
      </Field>
      <Field label={t("confirmPassword")} htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" placeholder={t("passwordPlaceholder")} autoComplete="new-password" required />
      </Field>
      {state.invalidLink && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <span>
            {t("errors.resetLinkInvalid")}{" "}
            <Link href="/forgot-password" className="font-medium underline">
              {t("requestNewLink")}
            </Link>
          </span>
        </p>
      )}
      <Button type="submit" loading={pending} className="mt-1 w-full">
        {pending ? t("resettingPassword") : t("resetPassword")}
      </Button>
    </form>
  );
}
