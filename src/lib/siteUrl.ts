/**
 * The site's public origin (no trailing slash) — the base every canonical URL, hreflang alternate,
 * sitemap entry and social-card URL is built from. It must be the exact host the site is served
 * from (`www.` or not): if it names a different host, search engines are told the canonical copy of
 * every page lives somewhere else. Set APP_URL to that host in production (the same variable the
 * emailed links use); Vercel's production-URL variable is the fallback.
 */
export const SITE_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://extrack.me")
).replace(/\/+$/, "");
