"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatCompactNumber, formatCurrency } from "@/lib/format";
import type { TrendPoint } from "@/lib/finance";

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
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const t = useTranslations("YearView");
  const locale = useLocale();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxRaw = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense, d.saved)));
  const max = niceMax(maxRaw * 1.15);
  const n = data.length;

  const band = plotW / n;
  const x = (i: number) => PAD_LEFT + band * (i + 0.5);
  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH;
  const baseY = PAD_TOP + plotH;
  const groupW = Math.min(band * 0.72, 54);
  const barW = groupW / 3;

  // Thin the x-axis ticks once a daily range packs in more points than fit legibly.
  const labelStep = Math.max(1, Math.ceil(n / 8));

  const gridSteps = 4;
  const gridValues = Array.from(
    { length: gridSteps + 1 },
    (_, i) => (max / gridSteps) * i,
  );

  // The latest period is shown by default; hovering (or tapping) another bar group swaps the tooltip to it.
  const activeIndex = hoverIndex ?? n - 1;
  const hovered = n > 0 ? data[activeIndex] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-[12.5px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--series-1)" }}
          />
          {t("income")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--series-2)" }}
          />
          {t("expense")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--series-3)" }}
          />
          {t("saved")}
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={t("chartAria")}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {gridValues.map((v) => (
            <g key={v}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--gridline)"
                strokeWidth="1"
              />
              <text
                x={PAD_LEFT - 8}
                y={y(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="10.5"
                fill="var(--text-muted)"
              >
                {formatCompactNumber(Math.round(v), locale)}
              </text>
            </g>
          ))}

          {data.map(
            (d, i) =>
              i % labelStep === 0 && (
                <text
                  key={d.key}
                  x={x(i)}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="var(--text-muted)"
                >
                  {d.label}
                </text>
              )
          )}

          {data.map((d, i) => {
            const series = [
              { v: d.income, c: "var(--series-1)" },
              { v: d.expense, c: "var(--series-2)" },
              { v: Math.max(0, d.saved), c: "var(--series-3)" },
            ];
            return (
              <g key={`bars-${d.key}`} opacity={i === activeIndex ? 1 : 0.55}>
                {series.map((b, j) => (
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
            );
          })}

          {/* Hover / tap hit targets */}
          {data.map((d, i) => (
            <rect
              key={`hit-${d.key}`}
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
              // Slide the tooltip's anchor from its left edge (first point) to its right edge
              // (last point) so it never spills past the chart, however narrow the screen.
              left: `${(x(activeIndex) / WIDTH) * 100}%`,
              transform: `translateX(-${(x(activeIndex) / WIDTH) * 100}%)`,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="mb-1 font-medium text-text-primary">{hovered.fullLabel}</p>
            <p className="flex items-center gap-1.5 text-text-secondary">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--series-1)" }}
              />{" "}
              {t("income")}{" "}
              <span className="font-medium text-text-primary">
                {formatCurrency(hovered.income, "BDT", locale)}
              </span>
            </p>
            <p className="flex items-center gap-1.5 text-text-secondary">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--series-2)" }}
              />{" "}
              {t("expense")}{" "}
              <span className="font-medium text-text-primary">
                {formatCurrency(hovered.expense, "BDT", locale)}
              </span>
            </p>
            <p className="flex items-center gap-1.5 text-text-secondary">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--series-3)" }}
              />{" "}
              {t("saved")}{" "}
              <span className="font-medium text-text-primary">
                {formatCurrency(hovered.saved, "BDT", locale)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
