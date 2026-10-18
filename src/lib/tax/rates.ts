/**
 * Bangladesh individual income-tax rules, one object per rate schedule. Every number the
 * calculator uses lives here — nothing in calculate.ts is hardcoded — so a change in the
 * Finance Act is a one-file edit.
 *
 * STATUS: not yet checked against the Finance Act / NBR SRO text — only against news and
 * advisory sites. Schedules are keyed by income year (the 1 Jul – 30 Jun year the income is
 * earned in). bdnews24 quotes the NBR chairman putting income from July 2025 under the
 * ৳3,75,000 structure; the Finance Act 2026 (Daily Star) raises it to ৳4,00,000 for FY2026-27.
 * Once the NBR document is confirmed, set `verified: true` and fix `source`.
 */

export type TaxpayerCategory = "general" | "womanOrSenior" | "disabled" | "freedomFighter";

export interface TaxSlab {
  /** Width of this band in taka; null = no upper bound (the last band). */
  width: number | null;
  rate: number;
}

export interface TaxSchedule {
  id: string;
  /** Calendar year the income year starts in: 2025 = income of 1 Jul 2025 – 30 Jun 2026 (AY 2026-27). */
  incomeYearStart: number;
  verified: boolean;
  /** Where the numbers came from — shown to the user so they can check them. */
  source: string;
  /** Tax-free income by taxpayer category. */
  thresholds: Record<TaxpayerCategory, number>;
  /** Bands applied in order to income above the threshold. */
  slabs: TaxSlab[];
  minimumTax: { general: number; newTaxpayer: number };
  /** Rebate = min(investment × investmentRate, taxable income × incomeRate, cap). */
  rebate: { investmentRate: number; incomeRate: number; cap: number };
  /** Surcharge as a share of tax payable, by net wealth. `above` is exclusive. */
  surcharge: { above: number; rate: number }[];
  /** Salary exemption = min(salary × fraction, cap). */
  salaryExemption: { fraction: number; cap: number };
}

const SLABS_2026: TaxSlab[] = [
  { width: 300_000, rate: 0.1 },
  { width: 400_000, rate: 0.15 },
  { width: 500_000, rate: 0.2 },
  { width: 2_000_000, rate: 0.25 },
  { width: null, rate: 0.3 },
];

const SURCHARGE: TaxSchedule["surcharge"] = [
  { above: 40_000_000, rate: 0.1 },
  { above: 100_000_000, rate: 0.2 },
  { above: 200_000_000, rate: 0.3 },
  { above: 500_000_000, rate: 0.35 },
];

const SALARY_EXEMPTION = { fraction: 1 / 3, cap: 450_000 };

export const TAX_SCHEDULES: TaxSchedule[] = [
  {
    id: "iy-2025-26",
    incomeYearStart: 2025,
    verified: false,
    source: "bdnews24, Prothom Alo, bdtaxguide.com",
    thresholds: { general: 375_000, womanOrSenior: 425_000, disabled: 500_000, freedomFighter: 525_000 },
    slabs: SLABS_2026,
    minimumTax: { general: 5_000, newTaxpayer: 1_000 },
    rebate: { investmentRate: 0.15, incomeRate: 0.03, cap: 1_000_000 },
    surcharge: SURCHARGE,
    salaryExemption: SALARY_EXEMPTION,
  },
  {
    id: "iy-2026-27",
    incomeYearStart: 2026,
    verified: false,
    source: "Daily Star (Finance Bill passed), roylawnexus.com",
    thresholds: { general: 400_000, womanOrSenior: 450_000, disabled: 525_000, freedomFighter: 550_000 },
    slabs: SLABS_2026,
    minimumTax: { general: 5_000, newTaxpayer: 1_000 },
    rebate: { investmentRate: 0.1, incomeRate: 0.03, cap: 750_000 },
    surcharge: SURCHARGE,
    salaryExemption: SALARY_EXEMPTION,
  },
];

/** The schedule for an income year; years outside the table use the nearest one. */
export function getScheduleForYear(startYear: number): TaxSchedule {
  const first = TAX_SCHEDULES[0];
  const last = TAX_SCHEDULES[TAX_SCHEDULES.length - 1];
  if (startYear <= first.incomeYearStart) return first;
  if (startYear >= last.incomeYearStart) return last;
  return TAX_SCHEDULES.find((s) => s.incomeYearStart === startYear) ?? last;
}
