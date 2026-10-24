"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { deleteEntryAction } from "@/app/actions/investments";
import { cx } from "@/components/cx";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvestmentEntry } from "@/lib/investments";

const SIGN: Record<InvestmentEntry["kind"], string> = { contribution: "", return: "+", value_update: "", withdrawal: "", writeoff: "" };

export function InvestmentTimeline({
  investmentId,
  entries,
  walletNames,
}: {
  investmentId: string;
  entries: InvestmentEntry[];
  /** Wallet id → name, for entries that moved money. */
  walletNames: Record<string, string>;
}) {
  const t = useTranslations("Investments");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function remove(id: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteEntryAction(investmentId, id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col">
      {error && <p role="alert" className="mb-2 text-[13px] text-status-critical">{error}</p>}
      <ul className="divide-y divide-border">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{t(`kind.${e.kind}`)}</p>
              <p className="truncate text-[12.5px] text-text-muted">
                {formatDate(e.date, locale)}
                {e.walletId && walletNames[e.walletId] ? ` · ${walletNames[e.walletId]}` : ""}
                {e.note ? ` · ${e.note}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cx("text-sm font-medium tabular-nums", e.kind === "return" ? "text-status-good" : "text-text-primary")}>
                {SIGN[e.kind]}
                {formatCurrency(e.amount, "BDT", locale)}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(e.id)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-status-critical-soft hover:text-status-critical disabled:opacity-50"
                aria-label={t("removeEntry")}
                title={t("removeEntry")}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
