"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dropdown } from "@/components/Dropdown";
import { cx } from "@/components/cx";

export function YearPicker({ year, className }: { year: number; className?: string }) {
  const t = useTranslations("YearView");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(y: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(y));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const nowYear = new Date().getFullYear();
  const first = Math.min(nowYear - 8, year);
  const last = Math.max(nowYear + 1, year);
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);

  return (
    <div className={cx("flex items-center justify-center gap-2 rounded-lg border border-border bg-surface p-1", className)}>
      <button
        type="button"
        onClick={() => go(year - 1)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
        aria-label={t("previousYear")}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
      </button>
      <Dropdown variant="ghost" value={year} onChange={(e) => go(Number(e.target.value))} aria-label={t("year")}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Dropdown>
      <button
        type="button"
        onClick={() => go(year + 1)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
        aria-label={t("nextYear")}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
