"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ArrowRight, ChevronDown, SlidersHorizontal, Search, X } from "lucide-react";
import { Button, cx, Input, Select } from "@/components/ui";
import { ALL_CATEGORIES } from "@/lib/categories";
import { parseMonthParams } from "@/lib/transactionFilters";
import type { Wallet } from "@/lib/types";
import { MonthFilter } from "./MonthFilter";

export function FilterBar({
  wallets,
  showWalletFilter = false,
  showTypeFilter = true,
  showCategoryFilter = true,
  showMonthFilter = true,
}: {
  wallets?: Wallet[];
  showWalletFilter?: boolean;
  showTypeFilter?: boolean;
  showCategoryFilter?: boolean;
  /** Month/year picker — hide it where the page already owns the `year`/`month` params (compare mode). */
  showMonthFilter?: boolean;
}) {
  const t = useTranslations("Transactions");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Nothing to sync when the box already matches the URL (notably on first render). Without this,
    // the mount-time timer rewrites the URL from a stale snapshot of the params, wiping out any
    // filter picked in the 300ms after the page loads.
    if (q === (searchParams.get("q") ?? "")) return;
    debounceRef.current = setTimeout(() => setParam("q", q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeFilterCount =
    ["kind", "category", "walletId", "from", "to", "q"].filter((key) => searchParams.get(key)).length +
    (showMonthFilter && parseMonthParams(Object.fromEntries(searchParams.entries())) ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  function clearAll() {
    setQ("");
    const params = new URLSearchParams();
    // In compare mode `year`/`month` are the comparison's base month, not a filter in this bar —
    // clearing the filters must not knock the page out of compare mode.
    if (searchParams.get("compare") === "1") {
      for (const key of ["compare", "year", "month", "cy", "cm"]) {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
      }
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // Type / category / wallet share a row, so how wide each one is depends on how many there are.
  const selects: { key: string; node: ReactNode }[] = [];
  if (showTypeFilter) {
    selects.push({
      key: "kind",
      node: (
        <Select
          value={searchParams.get("kind") ?? "all"}
          onChange={(e) => setParam("kind", e.target.value === "all" ? "" : e.target.value)}
          aria-label={t("filterByType")}
        >
          <option value="all">{t("allTypes")}</option>
          <option value="expense">{tCommon("kindExpense")}</option>
          <option value="income">{tCommon("kindIncome")}</option>
          <option value="transfer">{tCommon("kindTransfer")}</option>
        </Select>
      ),
    });
  }
  if (showCategoryFilter) {
    selects.push({
      key: "category",
      node: (
        <Select
          value={searchParams.get("category") ?? ""}
          onChange={(e) => setParam("category", e.target.value)}
          aria-label={t("filterByCategory")}
        >
          <option value="">{t("allCategories")}</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {tCategories(c)}
            </option>
          ))}
        </Select>
      ),
    });
  }
  if (showWalletFilter && wallets) {
    selects.push({
      key: "wallet",
      node: (
        <Select
          value={searchParams.get("walletId") ?? ""}
          onChange={(e) => setParam("walletId", e.target.value)}
          aria-label={t("filterByWallet")}
        >
          <option value="">{t("allWallets")}</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
      ),
    });
  }
  const selectSpan = selects.length === 1 ? "lg:col-span-6" : selects.length === 2 ? "lg:col-span-3" : "lg:col-span-2";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-64 sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            strokeWidth={2}
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            aria-label={t("searchLabel")}
          />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="flex items-center gap-2 text-[13px] font-medium text-text-secondary sm:hidden"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
          {t("filters")}
          {hasActiveFilters && (
            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-brand-contrast">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")} strokeWidth={2} />
        </button>

        {/* The one reset. Sits beside the search on desktop, and next to the Filters toggle on mobile. */}
        {hasActiveFilters && (
          <Button type="button" variant="ghost" onClick={clearAll} className="ml-auto shrink-0 sm:ml-0">
            <X className="h-4 w-4" strokeWidth={2} />
            {tCommon("clearFilters")}
          </Button>
        )}
      </div>

      {/* An aligned grid: one column on phones, two on tablets, and from laptop width up a 6-column grid where
          the month and date range fill the first row and the selects split the second evenly (the month
          takes half the row on a laptop, a third on a big screen, so its picker never gets cramped). */}
      <div
        className={cx(
          "grid-cols-1 gap-3 rounded-lg border border-border bg-surface p-3 sm:grid sm:grid-cols-2 lg:grid-cols-6",
          filtersOpen ? "grid" : "hidden"
        )}
      >
        {showMonthFilter && (
          <div className="min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <MonthFilter />
          </div>
        )}

        <div
          role="group"
          aria-label={t("filterDates")}
          className={cx(
            "flex h-10 min-w-0 items-center rounded-lg border border-border bg-surface transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 sm:col-span-2",
            showMonthFilter ? "lg:col-span-3 xl:col-span-4" : "lg:col-span-6"
          )}
        >
          <input
            type="date"
            value={searchParams.get("from") ?? ""}
            onChange={(e) => setParam("from", e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-text-primary outline-none"
            aria-label={t("fromDate")}
          />
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />
          <input
            type="date"
            value={searchParams.get("to") ?? ""}
            onChange={(e) => setParam("to", e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-text-primary outline-none"
            aria-label={t("toDate")}
          />
        </div>

        {selects.map((field, i) => (
          <div
            key={field.key}
            // Two to a row below lg; if that leaves one over, it takes the whole row instead of a half-empty one.
            className={cx("min-w-0", selects.length % 2 === 1 && i === selects.length - 1 ? "sm:col-span-2" : "sm:col-span-1", selectSpan)}
          >
            {field.node}
          </div>
        ))}
      </div>
    </div>
  );
}
