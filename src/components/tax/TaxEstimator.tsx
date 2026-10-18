"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Card, Field, Input, Select, cx } from "@/components/ui";
import { calculateTax, type TaxInput } from "@/lib/tax/calculate";
import { getScheduleForYear, type TaxpayerCategory } from "@/lib/tax/rates";
import { fieldsFromSchedule, scheduleFromFields, type CustomRatesFields } from "@/lib/tax/custom";
import { CustomRatesForm } from "./CustomRatesForm";
import { formatCurrency, formatYear } from "@/lib/format";

const CATEGORIES: TaxpayerCategory[] = ["general", "womanOrSenior", "disabled", "freedomFighter"];

export interface TaxEstimatorProps {
  /** Calendar year the income year starts in (2025 = 1 Jul 2025 – 30 Jun 2026). */
  startYear: number;
  locale: string;
  /** Income-year totals read from the user's transactions, by tax head. */
  initialIncome: { salary: number; business: number; freelance: number; investment: number; other: number };
  /** Net worth from the user's wallets today. */
  trackedNetWorth: number;
  /** Savings-wallet balance, offered as a starting point for rebate-eligible investment. */
  savingsBalance: number;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="0"
          // Blurring on wheel stops a scroll over a focused number field from changing its value.
          onWheel={(e) => e.currentTarget.blur()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {hint && <p className="mt-1 text-[12px] text-text-muted">{hint}</p>}
      </div>
    </Field>
  );
}

type FieldKey =
  | "salary" | "business" | "freelance" | "investmentIncome" | "otherIncome"
  | "taxPaid"
  | "dps" | "sanchayapatra" | "insurance" | "shares"
  | "land" | "vehicles" | "jewellery" | "otherAssets"
  | "loans" | "otherLiabilities";

/** Form fields hold raw text so they can be empty; an empty or invalid field counts as 0. */
const toAmount = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const toField = (n: number) => (n > 0 ? String(Math.round(n * 100) / 100) : "");

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className={cx(muted ? "text-text-muted" : "text-text-secondary", strong && "font-semibold text-text-primary")}>{label}</span>
      <span className={cx("tabular-nums", strong ? "font-semibold text-text-primary" : "text-text-primary")}>{value}</span>
    </div>
  );
}

export function TaxEstimator({
  startYear,
  locale,
  initialIncome,
  trackedNetWorth,
  savingsBalance,
}: TaxEstimatorProps) {
  const t = useTranslations("Tax");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState<TaxpayerCategory>("general");
  const [newTaxpayer, setNewTaxpayer] = useState(false);
  const [fields, setFields] = useState<Record<FieldKey, string>>(() => ({
    salary: toField(initialIncome.salary),
    business: toField(initialIncome.business),
    freelance: toField(initialIncome.freelance),
    investmentIncome: toField(initialIncome.investment),
    otherIncome: toField(initialIncome.other),
    taxPaid: "",
    dps: "",
    sanchayapatra: "",
    insurance: "",
    shares: "",
    land: "",
    vehicles: "",
    jewellery: "",
    otherAssets: "",
    loans: "",
    otherLiabilities: "",
  }));
  // One input per key; the id, label and hint all come from the same key.
  const num = (key: FieldKey) => toAmount(fields[key]);
  const field = (key: FieldKey, hint?: string) => (
    <NumberField
      id={`tax-${key}`}
      label={t(`field.${key}`)}
      value={fields[key]}
      onChange={(v) => setFields((prev) => ({ ...prev, [key]: v }))}
      hint={hint}
    />
  );

  const standard = getScheduleForYear(startYear);
  const [mode, setMode] = useState<"standard" | "custom">("standard");
  // Seeded from the standard rates the first time custom is chosen, then owned by the user.
  const [custom, setCustom] = useState<CustomRatesFields | null>(null);
  const schedule = mode === "custom" && custom ? scheduleFromFields(custom, standard) : standard;

  function chooseMode(next: "standard" | "custom") {
    if (next === "custom" && !custom) setCustom(fieldsFromSchedule(standard, category));
    setMode(next);
  }
  const untrackedAssets = num("land") + num("vehicles") + num("jewellery") + num("otherAssets");
  const untrackedLiabilities = num("loans") + num("otherLiabilities");
  const netWealth = trackedNetWorth + untrackedAssets - untrackedLiabilities;
  const input: TaxInput = {
    category,
    newTaxpayer,
    salary: num("salary"),
    business: num("business") + num("freelance"),
    other: num("investmentIncome") + num("otherIncome"),
    investment: num("dps") + num("sanchayapatra") + num("insurance") + num("shares"),
    taxPaid: num("taxPaid"),
    netWealth,
  };
  const r = calculateTax(schedule, input);
  const money = (n: number) => formatCurrency(n, "BDT", locale);
  const pct = (n: number) => `${new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US", { maximumFractionDigits: 1 }).format(n * 100)}%`;

  function goYear(y: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(y));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }
  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => nowYear - i).filter((y) => y <= nowYear);
  if (!years.includes(startYear)) years.push(startYear);
  years.sort((a, b) => b - a);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label={t("ratesMode")} className="inline-flex w-fit rounded-lg border border-border bg-surface p-1">
          {(["standard", "custom"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => chooseMode(m)}
              className={cx(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                mode === m ? "bg-brand-soft text-brand" : "text-text-secondary hover:bg-surface-2",
              )}
            >
              {t(m === "standard" ? "modeStandard" : "modeCustom")}
            </button>
          ))}
        </div>
        {mode === "standard" && (
          <Card className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-text-muted" strokeWidth={2} />
            <p className="text-[13px] text-text-secondary">
              {t("standardNote", { amount: money(schedule.thresholds.general), source: schedule.source })}
            </p>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label={t("incomeYear")} htmlFor="tax-year">
              <Select id="tax-year" value={startYear} onChange={(e) => goYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {`${formatYear(y, locale)}–${formatYear(y + 1, locale)}`}
                  </option>
                ))}
              </Select>
            </Field>
            {mode === "standard" && (
            <Field label={t("taxpayerCategory")} htmlFor="tax-category">
              <Select id="tax-category" value={category} onChange={(e) => setCategory(e.target.value as TaxpayerCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </Select>
            </Field>
            )}
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-text-secondary">
              <input type="checkbox" checked={newTaxpayer} onChange={(e) => setNewTaxpayer(e.target.checked)} className="h-4 w-4 accent-brand" />
              {t("newTaxpayer")}
            </label>
          </Card>

          {mode === "custom" && custom && (
            <CustomRatesForm fields={custom} onChange={setCustom} onReset={() => setCustom(fieldsFromSchedule(standard, category))} />
          )}

          <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="text-sm font-semibold text-text-primary">{t("incomeSection")}</h3>
              <p className="text-[12.5px] text-text-muted">{t("incomeDesc")}</p>
            </div>
            {field("salary", t("salaryHint"))}
            {field("business", t("businessHint"))}
            {field("freelance", t("freelanceHint"))}
            {field("investmentIncome", t("investmentIncomeHint"))}
            {field("otherIncome", t("otherIncomeHint"))}
          </Card>

          <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="text-sm font-semibold text-text-primary">{t("rebateSection")}</h3>
              <p className="text-[12.5px] text-text-muted">{t("rebateDesc", { savings: money(savingsBalance) })}</p>
            </div>
            {field("dps")}
            {field("sanchayapatra")}
            {field("insurance")}
            {field("shares")}
          </Card>

          <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="text-sm font-semibold text-text-primary">{t("wealthSection")}</h3>
              <p className="text-[12.5px] text-text-muted">{t("wealthDesc")}</p>
            </div>
            {field("land")}
            {field("vehicles")}
            {field("jewellery")}
            {field("otherAssets")}
            {field("loans")}
            {field("otherLiabilities")}
            <div className="sm:col-span-2">
              <Row label={t("trackedNetWorth")} value={money(trackedNetWorth)} muted />
              <Row label={t("untrackedAssetsTotal")} value={`+ ${money(untrackedAssets)}`} muted />
              <Row label={t("untrackedLiabilitiesTotal")} value={`− ${money(untrackedLiabilities)}`} muted />
              <Row label={t("netWealth")} value={money(netWealth)} strong />
            </div>
          </Card>

          <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <h3 className="text-sm font-semibold text-text-primary sm:col-span-2">{t("paidSection")}</h3>
            {field("taxPaid", t("taxPaidHint"))}
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="p-5">
            <p className="text-[13px] text-text-muted">{r.balance >= 0 ? t("balanceDue") : t("balanceRefund")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-text-primary tabular-nums">{money(Math.abs(r.balance))}</p>
            <p className="mt-1 text-[12.5px] text-text-muted">{t("totalTaxLine", { amount: money(r.totalTax) })}</p>
          </Card>

          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">{t("breakdown")}</h3>
            <div className="divide-y divide-border">
              <div>
                <Row label={t("grossIncome")} value={money(r.grossIncome)} />
                <Row label={t("salaryExemption")} value={`− ${money(r.salaryExemption)}`} />
                <Row label={t("taxableIncome")} value={money(r.taxableIncome)} strong />
                <Row label={t("taxFree", { amount: money(r.threshold) })} value={money(Math.min(r.taxableIncome, r.threshold))} muted />
              </div>
              <div className="py-2">
                {r.slabs.map((s, i) => (
                  <Row
                    key={i}
                    label={t("slabLine", { rate: pct(s.rate), amount: money(s.amount) })}
                    value={money(s.tax)}
                    muted={s.amount === 0}
                  />
                ))}
              </div>
              <div>
                <Row label={t("slabTax")} value={money(r.slabTax)} />
                <Row label={t("rebate")} value={`− ${money(r.rebate)}`} />
                {r.minimumTaxApplied && <Row label={t("minimumTaxApplied")} value={money(r.incomeTax)} />}
                <Row label={t("incomeTax")} value={money(r.incomeTax)} strong />
                <Row label={t("surcharge", { rate: pct(r.surchargeRate) })} value={money(r.surcharge)} />
                <Row label={t("totalTax")} value={money(r.totalTax)} strong />
                <Row label={t("taxPaidLine")} value={`− ${money(r.taxPaid)}`} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <p className="text-[12.5px] text-text-muted">{t("disclaimer")}</p>
    </div>
  );
}
