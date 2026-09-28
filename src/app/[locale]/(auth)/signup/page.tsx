import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "@/components/auth/SignupForm";
import { isGoogleAuthConfigured } from "@/lib/google";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: `${t("signupTitle")} — Extrack` };
}

export default function SignupPage() {
  return <SignupForm googleEnabled={isGoogleAuthConfigured()} />;
}
