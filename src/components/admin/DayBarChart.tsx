import { formatDateShort, formatNumber } from "@/lib/format";
import type { DayPoint } from "@/lib/admin";

/**
 * A small daily bar chart — plain flex/CSS bars, so it renders on the server and scales to any
 * width. Every bar carries its date and count in a native tooltip and the whole chart has a text
 * summary for screen readers.
 */
export function DayBarChart({
  data,
  slot,
  locale,
  summary,
}: {
  data: DayPoint[];
  /** Categorical color slot (1-8) from the shared chart palette. */
  slot: number;
  locale: string;
  /** Screen-reader description of what the chart shows. */
  summary: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div>
      <div className="flex h-32 items-end gap-0.5" role="img" aria-label={summary}>
        {data.map((point) => (
          <div
            key={point.date}
            title={`${formatDateShort(point.date, locale)}: ${formatNumber(point.count, locale)}`}
            className="min-h-0.5 flex-1 rounded-t-sm"
            style={{
              height: `${point.count > 0 ? Math.max((point.count / max) * 100, 4) : 1.5}%`,
              background: `var(--series-${slot})`,
              opacity: point.count > 0 ? 1 : 0.25,
            }}
          />
        ))}
      </div>
      {first && last && (
        <div className="mt-1.5 flex justify-between text-[11.5px] text-text-muted">
          <span>{formatDateShort(first.date, locale)}</span>
          <span>{formatDateShort(last.date, locale)}</span>
        </div>
      )}
    </div>
  );
}
