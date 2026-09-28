"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { currentYearMonth } from "@/lib/format";
import { parseMonthParams } from "@/lib/transactionFilters";

/**
 * Narrows a transaction list to one calendar month via the `year`/`month` query params
 * (folded into the date range by `parseFilters`), so each month's history can be browsed on
 * its own. With no month picked the list is "All time"; picking one reveals the same
 * prev/next month picker the dashboard and budgets pages use.
 */
export function MonthFilter() {
  const t = useTranslations("Transactions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = parseMonthParams(Object.fromEntries(searchParams.entries()));

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (!selected) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          update((params) => {
            const now = currentYearMonth();
            params.set("year", String(now.year));
            params.set("month", String(now.month));
          })
        }
        className="w-full sm:w-auto"
      >
        <CalendarDays className="h-4 w-4" strokeWidth={2} />
        {t("filterByMonth")}
      </Button>
    );
  }

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <MonthYearPicker year={selected.year} month={selected.month} className="flex-1 sm:flex-none" />
      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          update((params) => {
            params.delete("year");
            params.delete("month");
          })
        }
        className="shrink-0 whitespace-nowrap"
        aria-label={t("allTime")}
        title={t("allTime")}
      >
        <X className="h-4 w-4" strokeWidth={2} />
        {t("allTime")}
      </Button>
    </div>
  );
}
