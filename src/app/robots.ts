import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The signed-in app (each page is also marked noindex) and the auth/API endpoints.
        disallow: [
          "/api/",
          "/*/dashboard",
          "/*/wallets",
          "/*/transactions",
          "/*/budgets",
          "/*/savings",
          "/*/lend",
          "/*/debts",
          "/*/updates",
          "/*/admin",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
