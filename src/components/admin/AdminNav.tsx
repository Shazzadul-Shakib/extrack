"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "@/components/cx";

const TABS = [
  { href: "/admin", key: "overview" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/feature-requests", key: "featureRequests" },
] as const;

export function AdminNav() {
  const t = useTranslations("Admin.tabs");
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label={t("label")}>
      {TABS.map((tab) => {
        const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active ? "border-brand text-brand" : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
