import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/session";
import { getYearlyStatement } from "@/lib/yearStatement";
import { registerStatementFonts } from "@/lib/pdf/fonts";
import { YearlyStatementDocument, type YearlyStatementLabels } from "@/lib/pdf/YearlyStatementDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/statements/2026?locale=bn[&inline=1] — a year's compact statement as a PDF. */
export async function GET(request: Request, { params }: { params: Promise<{ year: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const year = Number((await params).year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return new Response("Invalid year", { status: 400 });

  const url = new URL(request.url);
  const requestedLocale = url.searchParams.get("locale");
  const locale = hasLocale(routing.locales, requestedLocale) ? requestedLocale : routing.defaultLocale;
  const inline = url.searchParams.get("inline") === "1";

  const [statement, t, tStatement, tCategories] = await Promise.all([
    getYearlyStatement(user, year),
    getTranslations({ locale, namespace: "YearView" }),
    getTranslations({ locale, namespace: "Statement" }),
    getTranslations({ locale, namespace: "Categories" }),
  ]);

  const labels: YearlyStatementLabels = {
    locale,
    t: (key, values) => t(key as never, values as never),
    tStatement: (key, values) => tStatement(key as never, values as never),
    category: (category) => (tCategories.has(category as never) ? tCategories(category as never) : category),
  };

  registerStatementFonts();
  const pdf = await renderToBuffer(
    createElement(YearlyStatementDocument, { statement, labels }) as unknown as ReactElement<DocumentProps>,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="extrack-statement-${year}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
