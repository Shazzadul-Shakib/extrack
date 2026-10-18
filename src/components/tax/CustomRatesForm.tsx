"use client";

import { useTranslations } from "next-intl";
import { Button, Card, Input, Label } from "@/components/ui";
import type { CustomRatesFields } from "@/lib/tax/custom";

function Cell({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="0"
          // Blurring on wheel stops a scroll over a focused number field from changing its value.
          onWheel={(e) => e.currentTarget.blur()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={suffix ? "pr-8" : undefined}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

export function CustomRatesForm({
  fields,
  onChange,
  onReset,
}: {
  fields: CustomRatesFields;
  onChange: (next: CustomRatesFields) => void;
  onReset: () => void;
}) {
  const t = useTranslations("Tax");
  const set = <K extends keyof CustomRatesFields>(key: K, value: CustomRatesFields[K]) => onChange({ ...fields, [key]: value });
  const setSlab = (i: number, patch: Partial<CustomRatesFields["slabs"][number]>) =>
    set("slabs", fields.slabs.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const setTier = (i: number, patch: Partial<CustomRatesFields["surcharge"][number]>) =>
    set("surcharge", fields.surcharge.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const lastSlab = fields.slabs.length - 1;

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t("customTitle")}</h3>
          <p className="text-[12.5px] text-text-muted">{t("customDesc")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          {t("customReset")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Cell label={t("customThreshold")} value={fields.threshold} onChange={(v) => set("threshold", v)} />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-medium text-text-secondary">{t("customSlabs")}</p>
        {fields.slabs.map((s, i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            {i === lastSlab ? (
              <div className="flex flex-col gap-1.5">
                <Label>{t("customSlabWidth", { n: i + 1 })}</Label>
                <p className="flex h-10 items-center text-sm text-text-muted">{t("customSlabRest")}</p>
              </div>
            ) : (
              <Cell label={t("customSlabWidth", { n: i + 1 })} value={s.width} onChange={(v) => setSlab(i, { width: v })} />
            )}
            <Cell label={t("customSlabRate")} value={s.rate} onChange={(v) => setSlab(i, { rate: v })} suffix="%" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Cell label={t("customMinGeneral")} value={fields.minimumGeneral} onChange={(v) => set("minimumGeneral", v)} />
        <Cell label={t("customMinNew")} value={fields.minimumNew} onChange={(v) => set("minimumNew", v)} />
        <Cell label={t("customRebateInvestment")} value={fields.rebateInvestmentPct} onChange={(v) => set("rebateInvestmentPct", v)} suffix="%" />
        <Cell label={t("customRebateIncome")} value={fields.rebateIncomePct} onChange={(v) => set("rebateIncomePct", v)} suffix="%" />
        <Cell label={t("customRebateCap")} value={fields.rebateCap} onChange={(v) => set("rebateCap", v)} />
        <div />
        <Cell label={t("customSalaryPct")} value={fields.salaryExemptionPct} onChange={(v) => set("salaryExemptionPct", v)} suffix="%" />
        <Cell label={t("customSalaryCap")} value={fields.salaryExemptionCap} onChange={(v) => set("salaryExemptionCap", v)} />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-medium text-text-secondary">{t("customSurcharge")}</p>
        {fields.surcharge.map((s, i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <Cell label={t("customSurchargeAbove")} value={s.above} onChange={(v) => setTier(i, { above: v })} />
            <Cell label={t("customSurchargeRate")} value={s.rate} onChange={(v) => setTier(i, { rate: v })} suffix="%" />
          </div>
        ))}
      </div>
    </Card>
  );
}
