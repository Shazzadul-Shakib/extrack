import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { publicPageMetadata } from "@/lib/seo";
import { SignupForm } from "@/components/auth/SignupForm";
import { isGoogleAuthConfigured } from "@/lib/google";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return publicPageMetadata({ locale, path: "/signup", title: `${t("signupTitle")} — Extrack`, description: t("signupDescription") });
}

export default function SignupPage() {
  return <SignupForm googleEnabled={isGoogleAuthConfigured()} />;
}
