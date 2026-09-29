import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { publicPageMetadata } from "@/lib/seo";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return publicPageMetadata({
    locale,
    path: "/forgot-password",
    title: `${t("forgotPasswordTitle")} — Extrack`,
    description: t("forgotPasswordDescription"),
  });
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
