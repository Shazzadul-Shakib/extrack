import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getUserSettings } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui";
import { LlmSettingsForm } from "@/components/settings/LlmSettingsForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settings" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [t, locale, settings] = await Promise.all([
    getTranslations("Settings"),
    getLocale(),
    getUserSettings(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
        <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex h-fit flex-col gap-3 p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-text-primary">{t("accountSectionTitle")}</h3>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-muted">{t("nameLabel")}</dt>
              <dd className="font-medium text-text-primary">{user.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-muted">{t("emailLabel")}</dt>
              <dd className="font-medium text-text-primary">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-muted">{t("memberSince")}</dt>
              <dd className="font-medium text-text-primary">{formatDate(user.createdAt.slice(0, 10), locale)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col gap-4 p-5 lg:col-span-2">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{t("llmSectionTitle")}</h3>
            <p className="text-[13px] text-text-muted">{t("llmSectionDesc")}</p>
          </div>
          <LlmSettingsForm settings={settings} />
        </Card>
      </div>
    </div>
  );
}
