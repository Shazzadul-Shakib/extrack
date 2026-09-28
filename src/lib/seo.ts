import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

const OG_LOCALES: Record<string, string> = { en: "en_US", bn: "bn_BD" };

/** Path of a public page within a locale: "" for the home page, "/login", "/signup". */
export type PublicPath = "" | "/login" | "/signup";

/**
 * The full set of search-facing metadata for one public page: its own canonical URL, an hreflang
 * link to every language version (plus x-default), and matching Open Graph / Twitter cards.
 *
 * Each page has to say this itself. Metadata set in the shared layout would stamp every page —
 * including the signed-in app — with the home page's canonical URL.
 */
export function publicPageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  path: PublicPath;
  title: string;
  description: string;
}): Metadata {
  const url = `/${locale}${path}`;
  const languages: Record<string, string> = Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`]));
  languages["x-default"] = `/${routing.defaultLocale}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      title,
      description,
      url,
      siteName: "Extrack",
      images: [{ url: "/screenshots/dashboard.png", width: 1911, height: 897, alt: "Extrack dashboard" }],
      locale: OG_LOCALES[locale] ?? "en_US",
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALES[l]),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/screenshots/dashboard.png"],
    },
  };
}
