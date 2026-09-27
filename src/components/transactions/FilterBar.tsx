"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronDown, SlidersHorizontal, Search } from "lucide-react";
import { cx, Input, Select } from "@/components/ui";
import { ALL_CATEGORIES } from "@/lib/categories";
import type { Wallet } from "@/lib/types";

export function FilterBar({
  wallets,
  showWalletFilter = false,
  showTypeFilter = true,
  showCategoryFilter = true,
}: {
  wallets?: Wallet[];
  showWalletFilter?: boolean;
  showTypeFilter?: boolean;
  showCategoryFilter?: boolean;
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
    debounceRef.current = setTimeout(() => setParam("q", q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeFilterCount = ["kind", "category", "walletId", "from", "to", "q"].filter((key) =>
    searchParams.get(key)
  ).length;
  const hasActiveFilters = activeFilterCount > 0;

  function clearAll() {
    setQ("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
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
        className="flex items-center gap-2 self-start text-[13px] font-medium text-text-secondary sm:hidden"
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

      <div
        className={cx(
          "flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3 sm:flex",
          filtersOpen ? "flex" : "hidden"
        )}
      >
        {showTypeFilter && (
          <Select
            value={searchParams.get("kind") ?? "all"}
            onChange={(e) =>
              setParam("kind", e.target.value === "all" ? "" : e.target.value)
            }
            className="w-full sm:w-36"
            aria-label={t("filterByType")}
          >
            <option value="all">{t("allTypes")}</option>
            <option value="expense">{tCommon("kindExpense")}</option>
            <option value="income">{tCommon("kindIncome")}</option>
            <option value="transfer">{tCommon("kindTransfer")}</option>
          </Select>
        )}

        {showCategoryFilter && (
          <Select
            value={searchParams.get("category") ?? ""}
            onChange={(e) => setParam("category", e.target.value)}
            className="w-full sm:w-44"
            aria-label={t("filterByCategory")}
          >
            <option value="">{t("allCategories")}</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tCategories(c)}
              </option>
            ))}
          </Select>
        )}

        {showWalletFilter && wallets && (
          <Select
            value={searchParams.get("walletId") ?? ""}
            onChange={(e) => setParam("walletId", e.target.value)}
            className="w-full sm:w-40"
            aria-label={t("filterByWallet")}
          >
            <option value="">{t("allWallets")}</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        )}

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            type="date"
            value={searchParams.get("from") ?? ""}
            onChange={(e) => setParam("from", e.target.value)}
            className="w-full sm:w-40"
            aria-label={t("fromDate")}
          />
          <span className="hidden shrink-0 text-text-muted sm:inline">–</span>
          <Input
            type="date"
            value={searchParams.get("to") ?? ""}
            onChange={(e) => setParam("to", e.target.value)}
            className="w-full sm:w-40"
            aria-label={t("toDate")}
          />
        </div>

        <Select
          value={searchParams.get("sort") ?? "date_desc"}
          onChange={(e) => setParam("sort", e.target.value)}
          className="w-full sm:ml-auto sm:w-40"
          aria-label={t("sortTransactions")}
        >
          <option value="date_desc">{t("sortNewest")}</option>
          <option value="date_asc">{t("sortOldest")}</option>
          <option value="amount_desc">{t("sortAmountDesc")}</option>
          <option value="amount_asc">{t("sortAmountAsc")}</option>
        </Select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[13px] font-medium text-brand hover:underline"
          >
            {tCommon("clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
