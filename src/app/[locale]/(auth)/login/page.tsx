import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm, type LoginNotice } from "@/components/auth/LoginForm";
import { isGoogleAuthConfigured } from "@/lib/google";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: `${t("loginTitle")} — Extrack` };
}

/** Maps the query params the verify-email and Google routes redirect back with onto a banner. */
function noticeFrom(params: { [key: string]: string | string[] | undefined }): LoginNotice | undefined {
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  if (first("verified") === "1") return "verified";
  switch (first("error")) {
    case "verify":
      return "verify_error";
    case "google":
      return "google_error";
    case "google_conflict":
      return "google_conflict";
    case "google_unavailable":
      return "google_unavailable";
    default:
      return undefined;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <LoginForm googleEnabled={isGoogleAuthConfigured()} notice={noticeFrom(await searchParams)} />;
}
