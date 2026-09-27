import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { RELEASE_NOTES } from "@/lib/releaseNotes";
import { formatDate } from "@/lib/format";
import { Card, Badge } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Updates" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function UpdatesPage() {
  const [t, locale] = await Promise.all([getTranslations("Updates"), getLocale()]);
  const lang = locale === "bn" ? "bn" : "en";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
        <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
      </div>

      <div className="flex flex-col gap-4">
        {RELEASE_NOTES.map((note, i) => (
          <Card key={note.version} className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Sparkles className="h-4.5 w-4.5" strokeWidth={2} />
              </span>
              <h3 className="text-[15px] font-semibold text-text-primary">{note.title[lang]}</h3>
              <span className="text-[13px] font-medium text-text-muted">v{note.version}</span>
              {i === 0 && <Badge variant="brand">{t("currentBadge")}</Badge>}
              <span className="ml-auto text-[12.5px] text-text-muted">{t("released", { date: formatDate(note.date, locale) })}</span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 pl-1 text-[13.5px] text-text-secondary">
              {note.highlights[lang].map((line, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-muted" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
