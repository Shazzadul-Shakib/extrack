import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AlertCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { publicPageMetadata } from "@/lib/seo";
import { verifyPasswordResetToken } from "@/lib/passwordReset";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return publicPageMetadata({
    locale,
    path: "/reset-password",
    title: `${t("resetPasswordTitle")} — Extrack`,
    description: t("forgotPasswordDescription"),
  });
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  // Checked once here so a dead link shows a clear "request a new one" state instead of a form
  // that's doomed to fail on submit. resetPasswordAction re-checks it again at submit time.
  const user = await verifyPasswordResetToken(token);
  const t = await getTranslations("Auth");

  if (!user) {
    return (
      <div
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 text-center"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-critical-soft text-status-critical">
          <AlertCircle className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-text-primary">{t("resetLinkInvalidTitle")}</h2>
          <p className="text-[13.5px] text-text-secondary">{t("resetLinkInvalidDesc")}</p>
        </div>
        <p className="text-[13px] text-text-muted">
          <Link href="/forgot-password" className="font-medium text-brand hover:underline">
            {t("requestNewLink")}
          </Link>
        </p>
      </div>
    );
  }

  return <ResetPasswordForm token={token ?? ""} />;
}
