"use client";

import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Copy } from "lucide-react";
import { Button, Field, Select } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { copyBudgetsAction, type CopyBudgetsFormState } from "@/app/actions/budgets";
import { categoryIcon, categorySlot } from "@/lib/categories";
import { formatCurrency, getMonthNames } from "@/lib/format";
import type { Budget } from "@/lib/types";

const initialState: CopyBudgetsFormState = {};

// A plain (lowercase, non-JSX-invoked) helper rather than a `<CategoryRow />` component —
// it derives a category's icon via `categoryIcon()` per call, which the react-hooks
// "static-components" rule flags as an unstable component identity if rendered as JSX.
function categoryRow({
  category,
  amount,
  dim,
  tCategories,
  locale,
}: {
  category: string;
  amount?: number;
  dim?: boolean;
  tCategories: (key: string) => string;
  locale: string;
}) {
  const Icon = categoryIcon(category);
  return (
    <li key={category} className={`flex items-center justify-between gap-2 px-1 py-1 text-[13px] ${dim ? "text-text-muted" : "text-text-primary"}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: `var(--series-${categorySlot(category)})`, opacity: dim ? 0.5 : 1 }}
        />
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="truncate">{tCategories(category)}</span>
      </span>
      {amount !== undefined && <span className="shrink-0 tabular-nums">{formatCurrency(amount, "BDT", locale)}</span>}
    </li>
  );
}

export function CopyBudgetButton({
  budgets,
  year,
  month,
  className,
}: {
  /** Every one of the user's budgets, used to find source months and preview what a copy would do. */
  budgets: Budget[];
  year: number;
  month: number;
  className?: string;
}) {
  const t = useTranslations("Budgets");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const locale = useLocale();
  const monthNames = getMonthNames(locale);
  const [open, setOpen] = useState(false);

  const sourceMonths = useMemo(() => {
    const seen = new Map<string, { year: number; month: number }>();
    for (const b of budgets) {
      if (b.year === year && b.month === month) continue;
      seen.set(`${b.year}-${b.month}`, { year: b.year, month: b.month });
    }
    return Array.from(seen.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [budgets, year, month]);

  const action = useMemo(() => copyBudgetsAction.bind(null, year, month), [year, month]);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [source, setSource] = useState(() =>
    sourceMonths[0] ? `${sourceMonths[0].year}-${sourceMonths[0].month}` : ""
  );

  const targetLabel = `${monthNames[month - 1]} ${year}`;
  const [sourceYear, sourceMonth] = source.split("-").map(Number);
  const sourceLabel = sourceMonth ? `${monthNames[sourceMonth - 1]} ${sourceYear}` : "";

  const targetCategories = useMemo(
    () => new Set(budgets.filter((b) => b.year === year && b.month === month).map((b) => b.category)),
    [budgets, year, month]
  );
  const sourceBudgets = useMemo(
    () => budgets.filter((b) => b.year === sourceYear && b.month === sourceMonth),
    [budgets, sourceYear, sourceMonth]
  );
  const toCopy = useMemo(() => sourceBudgets.filter((b) => !targetCategories.has(b.category)), [sourceBudgets, targetCategories]);
  const toSkip = useMemo(() => sourceBudgets.filter((b) => targetCategories.has(b.category)), [sourceBudgets, targetCategories]);

  if (sourceMonths.length === 0) return null;

  function amountFor(category: string): number | undefined {
    return budgets.find((b) => b.year === year && b.month === month && b.category === category)?.amount;
  }

  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}>
        <Copy className="h-4 w-4" strokeWidth={2} />
        {t("copyBudget")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("copyBudgetTitle")}>
        {state.success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              {state.skipped?.length
                ? t("copyBudgetSuccessWithSkipped", {
                    copied: state.copied?.length ?? 0,
                    skipped: state.skipped.length,
                    month: targetLabel,
                  })
                : t("copyBudgetSuccess", { copied: state.copied?.length ?? 0, month: targetLabel })}
            </p>

            {!!state.copied?.length && (
              <div>
                <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-text-muted">{t("copiedHeading")}</p>
                <ul className="flex flex-col">
                  {state.copied.map((category) => (
                    categoryRow({ category, amount: amountFor(category), tCategories, locale })
                  ))}
                </ul>
              </div>
            )}

            {!!state.skipped?.length && (
              <div>
                <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-text-muted">{t("leftAsIsHeading")}</p>
                <ul className="flex flex-col">
                  {state.skipped.map((category) => (
                    categoryRow({ category, amount: amountFor(category), dim: true, tCategories, locale })
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={() => setOpen(false)} className="w-full">
              {tCommon("close")}
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <p className="text-[13px] text-text-muted">{t("copyBudgetDesc", { month: targetLabel })}</p>

            <Field label={t("copyFromMonth")} htmlFor="copy-source">
              <Select id="copy-source" name="source" value={source} onChange={(e) => setSource(e.target.value)}>
                {sourceMonths.map(({ year: y, month: m }) => (
                  <option key={`${y}-${m}`} value={`${y}-${m}`}>
                    {`${monthNames[m - 1]} ${y}`}
                  </option>
                ))}
              </Select>
            </Field>

            {sourceBudgets.length > 0 && (
              <div className="rounded-lg border border-border px-3 py-2.5">
                {toCopy.length > 0 && (
                  <div>
                    <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-text-muted">
                      {t("willCopyHeading", { count: toCopy.length })}
                    </p>
                    <ul className="flex flex-col">
                      {toCopy.map((b) => (
                        categoryRow({ category: b.category, amount: b.amount, tCategories, locale })
                      ))}
                    </ul>
                  </div>
                )}
                {toSkip.length > 0 && (
                  <div className={toCopy.length > 0 ? "mt-2.5 border-t border-border pt-2.5" : ""}>
                    <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-text-muted">
                      {t("alreadyBudgetedHeading", { count: toSkip.length })}
                    </p>
                    <ul className="flex flex-col">
                      {toSkip.map((b) => (
                        categoryRow({ category: b.category, amount: b.amount, dim: true, tCategories, locale })
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {state.error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                {state.error}
              </p>
            )}

            {toCopy.length > 0 ? (
              <Button type="submit" loading={pending} className="self-end">
                {pending ? t("copyingBudget") : t("copyBudgetSubmitCount", { count: toCopy.length })}
              </Button>
            ) : (
              <p className="text-center text-[13px] text-text-muted">
                {t("copyBudgetNothingToCopy", { source: sourceLabel, target: targetLabel })}
              </p>
            )}
          </form>
        )}
      </Modal>
    </>
  );
}
