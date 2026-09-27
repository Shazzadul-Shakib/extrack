"use client";

import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Copy } from "lucide-react";
import { Button, Field, Select } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { copyBudgetsAction, type CopyBudgetsFormState } from "@/app/actions/budgets";
import { getMonthNames } from "@/lib/format";
import type { Budget } from "@/lib/types";

const initialState: CopyBudgetsFormState = {};

export function CopyBudgetButton({
  budgets,
  year,
  month,
  className,
}: {
  /** Every one of the user's budgets, used only to find which other months actually have one to copy from. */
  budgets: Budget[];
  year: number;
  month: number;
  className?: string;
}) {
  const t = useTranslations("Budgets");
  const tCommon = useTranslations("Common");
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

  if (sourceMonths.length === 0) return null;

  const targetLabel = `${monthNames[month - 1]} ${year}`;

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
              {state.skipped
                ? t("copyBudgetSuccessWithSkipped", {
                    copied: state.copied ?? 0,
                    skipped: state.skipped,
                    month: targetLabel,
                  })
                : t("copyBudgetSuccess", { copied: state.copied ?? 0, month: targetLabel })}
            </p>
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

            {state.error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                {state.error}
              </p>
            )}

            <Button type="submit" loading={pending} className="w-full">
              {pending ? t("copyingBudget") : t("copyBudgetSubmit")}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
