"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { CalendarDays } from "lucide-react";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { currentYearMonth } from "@/lib/format";
import { parseMonthParams } from "@/lib/transactionFilters";

/**
 * Narrows a transaction list to one calendar month via the `year`/`month` query params
 * (folded into the date range by `parseFilters`), so each month's history can be browsed on
 * its own.
 *
 * It reads like the neighbouring dropdowns: with nothing picked it shows "All time" (click to
 * start from the current month), and once a month is picked it becomes the same prev/next month
 * picker the dashboard and budgets pages use. There's deliberately no separate "all time" button
 * — the filter bar's "Clear filters" resets the month along with the rest.
 */
export function MonthFilter() {
  const t = useTranslations("Transactions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = parseMonthParams(Object.fromEntries(searchParams.entries()));

  function pickCurrentMonth() {
    const params = new URLSearchParams(searchParams.toString());
    const now = currentYearMonth();
    params.set("year", String(now.year));
    params.set("month", String(now.month));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (!selected) {
    return (
      <button
        type="button"
        onClick={pickCurrentMonth}
        aria-label={t("filterByMonth")}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-left text-sm text-text-primary outline-none transition-colors hover:bg-surface-2 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
      >
        {t("allTime")}
        <CalendarDays className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={2} />
      </button>
    );
  }

  return <MonthYearPicker year={selected.year} month={selected.month} className="h-10 w-full" />;
}
