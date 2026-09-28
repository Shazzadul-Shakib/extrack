import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";
import { publicPageMetadata } from "@/lib/seo";
import { Landing } from "@/components/landing/Landing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  return publicPageMetadata({ locale, path: "", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const [user, { locale }] = await Promise.all([getCurrentUser(), params]);
  // Signed-in users skip the marketing page and go straight to their dashboard.
  if (user) redirect({ href: "/dashboard", locale });
  return <Landing />;
}
