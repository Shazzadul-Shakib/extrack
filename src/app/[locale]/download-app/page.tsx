import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Smartphone, Zap, Maximize } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logomark } from "@/components/Logomark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DownloadAppPanel } from "@/components/pwa/DownloadAppPanel";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Download" });
  return { title: `${t("title")} — Extrack`, robots: { index: false, follow: true } };
}

export default async function DownloadAppPage() {
  const [t, tCommon] = await Promise.all([getTranslations("Download"), getTranslations("Common")]);
  const perks = [
    { icon: Zap, text: t("perkOneTap") },
    { icon: Maximize, text: t("perkFullScreen") },
    { icon: Smartphone, text: t("perkNoStore") },
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center bg-page px-4 py-10">
      <LanguageSwitcher className="mb-8" />
      <main className="flex w-full max-w-100 flex-1 flex-col justify-center">
        <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex flex-col items-center gap-2">
            <Logomark />
            <h1 className="text-lg font-semibold text-text-primary">{t("title")}</h1>
            <p className="text-[13px] text-text-muted">{t("subtitle")}</p>
          </div>
          <ul className="flex flex-col gap-2 text-left">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[13px] text-text-secondary">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <DownloadAppPanel />
        </div>
        <Link href="/" className="mt-6 text-center text-[13px] text-text-secondary hover:text-text-primary">
          {t("back", { brand: tCommon("brand") })}
        </Link>
      </main>
    </div>
  );
}
