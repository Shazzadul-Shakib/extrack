"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatCompactNumber, formatCurrency, formatYear, monthLabel, monthLabelShort } from "@/lib/format";
import type { PortfolioPoint } from "@/lib/investments";

const WIDTH = 640;
const HEIGHT = 240;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Month-end amount invested vs. current value — the gap between the bars is the gain. */
export function PortfolioChart({ data }: { data: PortfolioPoint[] }) {
  const t = useTranslations("Investments");
  const locale = useLocale();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.invested, d.value))) * 1.15);
  const n = data.length;
  const band = plotW / n;
  const x = (i: number) => PAD_LEFT + band * (i + 0.5);
  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH;
  const baseY = PAD_TOP + plotH;
  const groupW = Math.min(band * 0.72, 40);
  const barW = groupW / 2;
  const gridValues = Array.from({ length: 5 }, (_, i) => (max / 4) * i);
  // The latest month is shown by default; hovering (or tapping) another bar group swaps the tooltip to it.
  const activeIndex = hoverIndex ?? n - 1;
  const hovered = n > 0 ? data[activeIndex] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-[12.5px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--series-1)" }} />
          {t("currentValue")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--series-4)" }} />
          {t("invested")}
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={t("chartAria")} onMouseLeave={() => setHoverIndex(null)}>
          {gridValues.map((v) => (
            <g key={v}>
              <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y(v)} y2={y(v)} stroke="var(--gridline)" strokeWidth="1" />
              <text x={PAD_LEFT - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="10.5" fill="var(--text-muted)">
                {formatCompactNumber(Math.round(v), locale)}
              </text>
            </g>
          ))}

          {data.map((d, i) => (
            <text key={`${d.year}-${d.month}`} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
              {monthLabelShort(d.month, locale)}
            </text>
          ))}

          {data.map((d, i) => (
            <g key={`bars-${d.year}-${d.month}`} opacity={i === activeIndex ? 1 : 0.55}>
              {[
                { v: d.value, c: "var(--series-1)" },
                { v: d.invested, c: "var(--series-4)" },
              ].map((b, j) => (
                <rect
                  key={j}
                  x={x(i) - groupW / 2 + j * barW}
                  y={y(b.v)}
                  width={Math.max(1, barW - 1.5)}
                  height={Math.max(0, baseY - y(b.v))}
                  rx="2"
                  fill={b.c}
                />
              ))}
            </g>
          ))}

          {data.map((d, i) => (
            <rect
              key={`hit-${d.year}-${d.month}`}
              x={PAD_LEFT + band * i}
              y={PAD_TOP}
              width={band}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onClick={() => setHoverIndex(i)}
            />
          ))}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] shadow-lg"
            style={{
              left: `${(x(activeIndex) / WIDTH) * 100}%`,
              transform: `translateX(-${(x(activeIndex) / WIDTH) * 100}%)`,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="mb-1 font-medium text-text-primary">{`${monthLabel(hovered.month, locale)} ${formatYear(hovered.year, locale)}`}</p>
            <p className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--series-1)" }} /> {t("currentValue")}{" "}
              <span className="font-medium text-text-primary">{formatCurrency(hovered.value, "BDT", locale)}</span>
            </p>
            <p className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--series-4)" }} /> {t("invested")}{" "}
              <span className="font-medium text-text-primary">{formatCurrency(hovered.invested, "BDT", locale)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
