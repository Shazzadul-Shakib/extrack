import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/shell/ServiceWorkerRegister";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { Analytics } from "@vercel/analytics/next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/siteUrl";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#1c3a5e",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("title");
  const description = t("description");

  // Site-wide defaults only. Anything that identifies a *page* — its canonical URL, hreflang
  // alternates, and social-card URL — is set by the page itself (see `publicPageMetadata`);
  // the signed-in app is marked noindex in its own layout.
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: [
      "personal finance tracker",
      "expense tracker app",
      "budget tracker",
      "savings tracker",
      "debt tracker",
      "wallet tracker",
    ],
    appleWebApp: { capable: true, title: "Extrack", statusBarStyle: "default" },
    openGraph: {
      title,
      description,
      siteName: "Extrack",
      images: ["/screenshots/dashboard.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/screenshots/dashboard.png"],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page text-text-primary">
        <NextIntlClientProvider>
          {children}
          <OfflineBanner />
          <ServiceWorkerRegister />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
