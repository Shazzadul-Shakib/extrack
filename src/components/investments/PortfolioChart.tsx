"use client";

import { useId, useState } from "react";
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

/** Month-end amount invested vs. current value — the gap between the lines is the gain. */
export function PortfolioChart({ data }: { data: PortfolioPoint[] }) {
  const t = useTranslations("Investments");
  const locale = useLocale();
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.invested, d.value))) * 1.15);
  const n = data.length;
  const x = (i: number) => PAD_LEFT + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH;
  const path = (pick: (d: PortfolioPoint) => number) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(pick(d))}`).join(" ");
  const valuePath = path((d) => d.value);
  const investedPath = path((d) => d.invested);
  const valueArea = `${valuePath} L ${x(n - 1)} ${PAD_TOP + plotH} L ${x(0)} ${PAD_TOP + plotH} Z`;
  const gridValues = Array.from({ length: 5 }, (_, i) => (max / 4) * i);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

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
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
            </linearGradient>
          </defs>

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

          <path d={valueArea} fill={`url(#${gradientId})`} />
          <path d={investedPath} fill="none" stroke="var(--series-4)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 4" />
          <path d={valuePath} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {data.map((d, i) => (
            <circle key={`dot-${d.year}-${d.month}`} cx={x(i)} cy={y(d.value)} r="4" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
          ))}

          {hoverIndex !== null && (
            <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke="var(--baseline)" strokeWidth="1" strokeDasharray="3 3" />
          )}

          {data.map((d, i) => (
            <rect key={`hit-${d.year}-${d.month}`} x={x(i) - plotW / n / 2} y={PAD_TOP} width={plotW / n} height={plotH} fill="transparent" onMouseEnter={() => setHoverIndex(i)} />
          ))}
        </svg>

        {hovered && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] shadow-lg"
            style={{
              left: `${(x(hoverIndex) / WIDTH) * 100}%`,
              transform: `translateX(-${(x(hoverIndex) / WIDTH) * 100}%)`,
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
