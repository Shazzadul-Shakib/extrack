"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cx } from "@/components/cx";

/** Monthly / Yearly switch, driven by the `view` query param (absent = monthly). */
export function ViewToggle({ view, className }: { view: "month" | "year"; className?: string }) {
  const t = useTranslations("YearView");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(next: "month" | "year") {
    if (next === view) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "year") params.set("view", "year");
    else params.delete("view");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={cx("inline-flex rounded-lg border border-border bg-surface p-1", className)} role="group">
      {(["month", "year"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => set(v)}
          aria-pressed={view === v}
          className={cx(
            "h-8 flex-1 rounded-md px-3 text-[13px] font-medium transition-colors",
            view === v ? "bg-brand text-brand-contrast" : "text-text-secondary hover:bg-surface-2",
          )}
        >
          {v === "month" ? t("viewMonthly") : t("viewYearly")}
        </button>
      ))}
    </div>
  );
}
