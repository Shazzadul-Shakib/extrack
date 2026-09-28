import { formatNumber } from "@/lib/format";

/** Horizontal bars for a short labelled breakdown of counts (already-translated labels). */
export function CountBars({
  rows,
  slot,
  locale,
  emptyLabel,
}: {
  rows: { label: string; value: number }[];
  slot: number;
  locale: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) return <p className="text-[13px] text-text-muted">{emptyLabel}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-[13px] text-text-secondary">{row.label}</span>
          <div className="relative h-4 flex-1 rounded-full bg-surface-2">
            <div
              className="h-4 rounded-full"
              style={{ width: `${Math.max((row.value / max) * 100, row.value > 0 ? 3 : 0)}%`, background: `var(--series-${slot})` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-[13px] font-medium tabular-nums text-text-primary">
            {formatNumber(row.value, locale)}
          </span>
        </div>
      ))}
    </div>
  );
}
