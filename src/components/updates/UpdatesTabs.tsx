import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cx } from "@/components/cx";

export type UpdatesTab = "releases" | "requests";

/** Two-tab switcher for the What's new page — plain links (`?tab=`), so it works without JS and survives a refresh. */
export async function UpdatesTabs({ active }: { active: UpdatesTab }) {
  const t = await getTranslations("Updates");
  const tabs: { key: UpdatesTab; href: string; label: string }[] = [
    { key: "releases", href: "/updates", label: t("tabReleases") },
    { key: "requests", href: "/updates?tab=requests", label: t("tabRequests") },
  ];

  return (
    <div role="tablist" aria-label={t("pageTitle")} className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          role="tab"
          aria-selected={active === tab.key}
          scroll={false}
          className={cx(
            "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            active === tab.key
              ? "border-brand text-brand"
              : "border-transparent text-text-secondary hover:text-text-primary",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
