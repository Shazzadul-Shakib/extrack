import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";
import { getFeatureRequests, type FeatureSort } from "@/lib/features";
import { cx } from "@/components/cx";
import { UpdatesTabs, type UpdatesTab } from "@/components/updates/UpdatesTabs";
import { ReleaseNotesList } from "@/components/updates/ReleaseNotesList";
import { FeatureRequestForm } from "@/components/updates/FeatureRequestForm";
import { FeatureRequestList } from "@/components/updates/FeatureRequestList";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Updates" });
  return { title: `${t("pageTitle")} — Extrack` };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [user, t, tFeatures, params] = await Promise.all([
    requireUser(),
    getTranslations("Updates"),
    getTranslations("Features"),
    searchParams,
  ]);
  const tab: UpdatesTab = first(params.tab) === "requests" ? "requests" : "releases";
  const sort: FeatureSort = first(params.sort) === "new" ? "new" : "top";
  const requests = tab === "requests" ? await getFeatureRequests(user.id, sort) : [];

  const sortOptions: { key: FeatureSort; href: string; label: string }[] = [
    { key: "top", href: "/updates?tab=requests", label: tFeatures("sortTop") },
    { key: "new", href: "/updates?tab=requests&sort=new", label: tFeatures("sortNew") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
        <p className="text-[13px] text-text-muted">{tab === "requests" ? t("pageDescRequests") : t("pageDesc")}</p>
      </div>

      <UpdatesTabs active={tab} />

      {tab === "releases" ? (
        <ReleaseNotesList />
      ) : (
        <div className="flex flex-col gap-6">
          <FeatureRequestForm />
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text-primary">{tFeatures("listTitle")}</h3>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5" role="group" aria-label={tFeatures("sortLabel")}>
                {sortOptions.map((option) => (
                  <Link
                    key={option.key}
                    href={option.href}
                    scroll={false}
                    aria-current={sort === option.key ? "true" : undefined}
                    className={cx(
                      "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                      sort === option.key ? "bg-brand-soft text-brand" : "text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
            <FeatureRequestList requests={requests} />
          </div>
        </div>
      )}
    </div>
  );
}
