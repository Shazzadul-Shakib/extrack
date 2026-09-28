import { headers } from "next/headers";

/**
 * The public origin of the app (no trailing slash) — what emailed links and the Google OAuth
 * redirect URI are built from.
 *
 * In production it must come from configuration (APP_URL, or Vercel's production-URL variable),
 * never from the incoming request: a link built from the `Host` header would let anyone who can
 * forge one get a victim's verification email to point at a server they control.
 */
export async function getAppUrl(): Promise<string> {
  const configured =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL environment variable is required in production (e.g. https://extrack.example.com).");
  }

  // Local dev only: trust the request, so `localhost:3000` (or whatever port) just works.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
