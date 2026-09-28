import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { RELEASE_NOTES } from "@/lib/releaseNotes";
import { SITE_URL } from "@/lib/siteUrl";

const PUBLIC_PAGES: { path: "" | "/login" | "/signup"; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/login", priority: 0.5, changeFrequency: "monthly" },
  { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  // The last release date, not "now" — a lastModified that changes on every request tells crawlers nothing.
  const lastModified = new Date(RELEASE_NOTES[0].date);

  return PUBLIC_PAGES.flatMap(({ path, priority, changeFrequency }) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: {
        languages: {
          ...Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
          "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
        },
      },
    })),
  );
}
