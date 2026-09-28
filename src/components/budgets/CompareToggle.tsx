"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GitCompareArrows } from "lucide-react";
import { cx } from "@/components/cx";
import { shiftYearMonth } from "@/lib/format";

/**
 * Flips the budgets / transactions page in and out of compare mode via the `compare` query param.
 * Turning it on seeds the comparison month (`cy`/`cm`) to the month before the base
 * month if the URL doesn't already carry one, and pins the base month (`year`/`month`).
 */
export function CompareToggle({
  active,
  baseYear,
  baseMonth,
}: {
  active: boolean;
  baseYear: number;
  baseMonth: number;
}) {
  const t = useTranslations("Budgets");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (active) {
      params.delete("compare");
      params.delete("cy");
      params.delete("cm");
    } else {
      params.set("compare", "1");
      // Pin the base month into the URL too, so pages that read it for something besides the
      // comparison itself (the Transactions list's month filter) see the same month.
      if (!params.has("year") || !params.has("month")) {
        params.set("year", String(baseYear));
        params.set("month", String(baseMonth));
      }
      if (!params.has("cy") || !params.has("cm")) {
        const prev = shiftYearMonth(baseYear, baseMonth, -1);
        params.set("cy", String(prev.year));
        params.set("cm", String(prev.month));
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={cx(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
        active
          ? "border-brand bg-brand-soft text-brand"
          : "border-border bg-surface text-text-secondary hover:bg-surface-2 hover:text-text-primary",
      )}
    >
      <GitCompareArrows className="h-4 w-4" strokeWidth={2} />
      {t("compare")}
    </button>
  );
}
