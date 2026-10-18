import type { TaxSchedule, TaxpayerCategory } from "./rates";

export interface TaxInput {
  category: TaxpayerCategory;
  newTaxpayer: boolean;
  /** Gross salary for the income year. */
  salary: number;
  /** Business, profession and freelance income, after allowable business expenses. */
  business: number;
  /** Everything else taxed at slab rates (rent, interest outside final tax, …). */
  other: number;
  /** Eligible rebate investment: DPS, sanchayapatra, life insurance premium, listed shares, … */
  investment: number;
  /** TDS and advance tax already paid for the year. */
  taxPaid: number;
  /** Net wealth at year end — decides the surcharge. */
  netWealth: number;
}

export interface SlabRow {
  /** Lower bound of the band, in taka. */
  from: number;
  /** Upper bound; null = no upper bound. */
  to: number | null;
  rate: number;
  /** Income that falls inside this band. */
  amount: number;
  tax: number;
}

export interface TaxResult {
  grossIncome: number;
  salaryExemption: number;
  taxableIncome: number;
  threshold: number;
  slabs: SlabRow[];
  slabTax: number;
  rebate: number;
  /** Tax after rebate, before the minimum-tax floor. */
  taxAfterRebate: number;
  minimumTaxApplied: boolean;
  /** Tax after rebate and the minimum-tax floor, before surcharge. */
  incomeTax: number;
  surchargeRate: number;
  surcharge: number;
  totalTax: number;
  taxPaid: number;
  /** Positive = still to pay; negative = refundable. */
  balance: number;
}

const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Pure — every rate comes from `rules`. Amounts are rounded to whole taka, as on the return. */
export function calculateTax(rules: TaxSchedule, input: TaxInput): TaxResult {
  const salary = nonNegative(input.salary);
  const grossIncome = salary + nonNegative(input.business) + nonNegative(input.other);

  const salaryExemption = Math.min(salary * rules.salaryExemption.fraction, rules.salaryExemption.cap);
  const taxableIncome = Math.max(0, Math.round(grossIncome - salaryExemption));
  const threshold = rules.thresholds[input.category];

  const slabs: SlabRow[] = [];
  let remaining = Math.max(0, taxableIncome - threshold);
  let from = threshold;
  let slabTax = 0;
  for (const slab of rules.slabs) {
    const amount = slab.width === null ? remaining : Math.min(remaining, slab.width);
    const tax = Math.round(amount * slab.rate);
    slabs.push({ from, to: slab.width === null ? null : from + slab.width, rate: slab.rate, amount, tax });
    slabTax += tax;
    remaining -= amount;
    from += slab.width ?? 0;
  }

  const rebate = Math.round(
    Math.min(
      nonNegative(input.investment) * rules.rebate.investmentRate,
      taxableIncome * rules.rebate.incomeRate,
      rules.rebate.cap,
      slabTax,
    ),
  );
  const taxAfterRebate = slabTax - rebate;

  const minimum = input.newTaxpayer ? rules.minimumTax.newTaxpayer : rules.minimumTax.general;
  const minimumTaxApplied = taxableIncome > threshold && taxAfterRebate < minimum;
  const incomeTax = taxableIncome > threshold ? Math.max(taxAfterRebate, minimum) : 0;

  const surchargeRate =
    [...rules.surcharge].reverse().find((tier) => input.netWealth > tier.above)?.rate ?? 0;
  const surcharge = Math.round(incomeTax * surchargeRate);
  const totalTax = incomeTax + surcharge;
  const taxPaid = nonNegative(input.taxPaid);

  return {
    grossIncome,
    salaryExemption: Math.round(salaryExemption),
    taxableIncome,
    threshold,
    slabs,
    slabTax,
    rebate,
    taxAfterRebate,
    minimumTaxApplied,
    incomeTax,
    surchargeRate,
    surcharge,
    totalTax,
    taxPaid,
    balance: totalTax - taxPaid,
  };
}

/** Income-year window (1 Jul – 30 Jun) for a year labelled by the calendar year it starts in. */
export function incomeYearRange(startYear: number): { start: string; end: string } {
  return { start: `${startYear}-07-01`, end: `${startYear + 1}-06-30` };
}

/** The income year that contains `today`: July onward belongs to the year starting now, earlier months to the one before. */
export function currentIncomeYearStart(now = new Date()): number {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}
