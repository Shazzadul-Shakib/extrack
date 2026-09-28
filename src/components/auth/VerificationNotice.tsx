"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MailCheck, MailWarning } from "lucide-react";
import { ResendVerification } from "./ResendVerification";

/** Shown in place of the signup form once an account exists but its email address still needs confirming. */
export function VerificationNotice({ email, sent }: { email: string; sent: boolean }) {
  const t = useTranslations("Auth");
  const Icon = sent ? MailCheck : MailWarning;
  return (
    <div
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 text-center"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <span
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
          sent ? "bg-brand-soft text-brand" : "bg-status-critical-soft text-status-critical"
        }`}
      >
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold text-text-primary">{sent ? t("checkInboxTitle") : t("emailNotSentTitle")}</h2>
        <p className="text-[13.5px] text-text-secondary">
          {sent ? t.rich("checkInboxDesc", { email, b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span> }) : t("emailNotSentDesc")}
        </p>
      </div>
      <ResendVerification email={email} />
      <p className="text-[13px] text-text-muted">
        <Link href="/login" className="font-medium text-brand hover:underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
