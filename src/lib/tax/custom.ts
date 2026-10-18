import type { TaxSchedule, TaxpayerCategory } from "./rates";

/** The editable form of a TaxSchedule: raw text, so a field can be empty while it's being typed. */
export interface CustomRatesFields {
  threshold: string;
  /** Percent values ("10" = 10%). The last band has no width — it takes whatever income is left. */
  slabs: { width: string; rate: string }[];
  minimumGeneral: string;
  minimumNew: string;
  rebateInvestmentPct: string;
  rebateIncomePct: string;
  rebateCap: string;
  salaryExemptionPct: string;
  salaryExemptionCap: string;
  surcharge: { above: string; rate: string }[];
}

const text = (n: number) => String(Math.round(n * 10_000) / 10_000);
const pct = (rate: number) => text(rate * 100);

export function fieldsFromSchedule(s: TaxSchedule, category: TaxpayerCategory): CustomRatesFields {
  return {
    threshold: text(s.thresholds[category]),
    slabs: s.slabs.map((b) => ({ width: b.width === null ? "" : text(b.width), rate: pct(b.rate) })),
    minimumGeneral: text(s.minimumTax.general),
    minimumNew: text(s.minimumTax.newTaxpayer),
    rebateInvestmentPct: pct(s.rebate.investmentRate),
    rebateIncomePct: pct(s.rebate.incomeRate),
    rebateCap: text(s.rebate.cap),
    salaryExemptionPct: pct(s.salaryExemption.fraction),
    salaryExemptionCap: text(s.salaryExemption.cap),
    surcharge: s.surcharge.map((t) => ({ above: text(t.above), rate: pct(t.rate) })),
  };
}

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** One threshold applies to everyone in custom mode, so the category picker plays no part. */
export function scheduleFromFields(f: CustomRatesFields, base: TaxSchedule): TaxSchedule {
  const threshold = num(f.threshold);
  return {
    ...base,
    id: "custom",
    source: "custom",
    thresholds: { general: threshold, womanOrSenior: threshold, disabled: threshold, freedomFighter: threshold },
    slabs: f.slabs.map((b, i) => ({
      width: i === f.slabs.length - 1 ? null : num(b.width),
      rate: num(b.rate) / 100,
    })),
    minimumTax: { general: num(f.minimumGeneral), newTaxpayer: num(f.minimumNew) },
    rebate: {
      investmentRate: num(f.rebateInvestmentPct) / 100,
      incomeRate: num(f.rebateIncomePct) / 100,
      cap: num(f.rebateCap),
    },
    salaryExemption: { fraction: num(f.salaryExemptionPct) / 100, cap: num(f.salaryExemptionCap) },
    // calculateTax picks the highest tier the wealth exceeds, so these must stay in ascending order.
    surcharge: f.surcharge
      .map((s) => ({ above: num(s.above), rate: num(s.rate) / 100 }))
      .filter((s) => s.above > 0)
      .sort((a, b) => a.above - b.above),
  };
}
