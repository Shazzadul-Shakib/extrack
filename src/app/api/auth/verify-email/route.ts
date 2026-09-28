import { NextResponse, type NextRequest } from "next/server";
import { getAppUrl } from "@/lib/appUrl";
import { confirmVerificationToken } from "@/lib/emailVerification";
import { routing } from "@/i18n/routing";

/** The link in the verification email: confirms the address, then sends the user to sign in. */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = routing.locales.find((l) => l === requested) ?? routing.defaultLocale;
  const user = await confirmVerificationToken(request.nextUrl.searchParams.get("token"));
  const appUrl = await getAppUrl();
  return NextResponse.redirect(`${appUrl}/${locale}/login?${user ? "verified=1" : "error=verify"}`);
}
