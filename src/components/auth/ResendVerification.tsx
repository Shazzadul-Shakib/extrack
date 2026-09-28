"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { resendVerificationAction, type ResendState } from "@/app/actions/auth";
import { Button } from "@/components/ui";

const initialState: ResendState = {};

/** A one-button form that emails `email` a fresh verification link. Must not be rendered inside another `<form>`. */
export function ResendVerification({ email }: { email: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(resendVerificationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="outline" loading={pending} className="w-full">
        {pending ? t("resending") : t("resendVerification")}
      </Button>
      {state.sent && (
        <p role="status" className="flex items-start gap-2 text-[13px] text-status-good">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {t("resendSent")}
        </p>
      )}
      {state.error && (
        <p role="alert" className="flex items-start gap-2 text-[13px] text-status-critical">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}
    </form>
  );
}
