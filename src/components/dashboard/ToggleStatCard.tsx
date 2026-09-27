"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cx } from "@/components/cx";
import { formatCompactCurrency } from "@/lib/format";

const accentStyles = {
  brand: "bg-brand-soft text-brand",
  good: "bg-status-good-soft text-status-good",
  critical: "bg-status-critical-soft text-status-critical",
  neutral: "bg-surface-2 text-text-secondary",
};

export interface StatView {
  /** Stable key for the toggle button. */
  key: string;
  /** Short label for the toggle button (e.g. "All", "Excl. savings"). */
  toggle: string;
  /** Full label shown above the value. */
  label: string;
  value: number;
  delta?: number;
  deltaGoodDirection?: "up" | "down";
  hint?: string;
  /** Overrides the card-level icon for this view — e.g. switching between Debt and Lend, which read as opposite things. */
  icon?: ReactNode;
  /** Overrides the card-level accent for this view. */
  accent?: keyof typeof accentStyles;
}

/**
 * A StatCard that flips between two or more precomputed views via a small
 * segmented toggle — used on the dashboard so the Expenses tile can show
 * spending with or without savings, and the Savings tile can show the running
 * total or just this month's contribution.
 */
export function ToggleStatCard({
  icon,
  accent = "neutral",
  views,
  locale = "en",
}: {
  /** A rendered icon element — components can't cross the server/client boundary as props, so pass `<Icon />`, not `Icon`. */
  icon: ReactNode;
  accent?: keyof typeof accentStyles;
  views: StatView[];
  locale?: string;
}) {
  const [active, setActive] = useState(0);
  const view = views[active] ?? views[0];

  const delta = view.delta;
  const hasDelta = typeof delta === "number" && Number.isFinite(delta) && delta !== 0;
  const deltaUp = (delta ?? 0) > 0;
  const goodDirection = view.deltaGoodDirection ?? "up";
  const isGood = hasDelta && (goodDirection === "up" ? deltaUp : !deltaUp);

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-secondary">{view.label}</span>
        <span
          className={cx(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accentStyles[view.accent ?? accent],
          )}
        >
          {view.icon ?? icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-text-primary">
          {formatCompactCurrency(view.value, "BDT", locale)}
        </span>
      </div>
      {hasDelta ? (
        <span
          className={cx(
            "inline-flex w-fit items-center gap-1 text-[12.5px] font-medium",
            isGood ? "text-status-good" : "text-status-critical",
          )}
        >
          {deltaUp ? (
            <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
          ) : (
            <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
          )}
          {Math.abs(delta!).toFixed(0)}% vs last month
        </span>
      ) : view.hint ? (
        <span className="text-[12.5px] text-text-muted">{view.hint}</span>
      ) : null}

      {views.length > 1 && (
        <div className="mt-auto flex w-fit items-center gap-0.5 rounded-full bg-surface-2 p-1">
          {views.map((v, i) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={cx(
                "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                i === active
                  ? "bg-brand text-brand-contrast shadow-sm"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              {v.toggle}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
