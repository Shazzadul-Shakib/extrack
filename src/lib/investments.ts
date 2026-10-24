export const INVESTMENT_TYPES = ["dps", "fdr", "sanchayapatra", "insurance", "shares", "mutual_fund", "bond", "business", "other"] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export type InvestmentEntryKind = "contribution" | "return" | "value_update" | "withdrawal" | "writeoff";

export interface Investment {
  id: string;
  userId: string;
  /** The wallet holding this investment's money, or null on one made before wallets backed investments. */
  walletId: string | null;
  name: string;
  type: InvestmentType;
  institution: string;
  startDate: string; // YYYY-MM-DD
  maturityDate: string | null;
  /** Yearly rate in percent. */
  ratePercent: number | null;
  rebateEligible: boolean;
  taxedAtSource: boolean;
  note: string;
  /** ISO timestamp the investment matured or was sold, or null while it's still open. */
  closedAt: string | null;
  createdAt: string;
}

export interface InvestmentEntry {
  id: string;
  investmentId: string;
  kind: InvestmentEntryKind;
  amount: number;
  date: string; // YYYY-MM-DD
  /** Where the money moved. For a return, the investment's own wallet means it was reinvested. */
  walletId: string | null;
  note: string;
  createdAt: string;
}

/** Types whose value grows at a fixed yearly rate, so it can be estimated without the user typing it in. */
export const RATED_TYPES: InvestmentType[] = ["dps", "fdr", "sanchayapatra", "bond"];
/** Types that usually count toward the income-tax rebate — the default for the "rebate" switch. */
export const REBATE_DEFAULT_TYPES: InvestmentType[] = ["dps", "sanchayapatra", "insurance", "shares", "mutual_fund"];
/** Types where the user normally has a maturity date. */
export const MATURING_TYPES: InvestmentType[] = ["dps", "fdr", "sanchayapatra", "insurance", "bond"];

export interface InvestmentSummary {
  /** Everything put in. */
  contributed: number;
  /** Cash taken back out (principal and any reinvested profit). */
  withdrawn: number;
  /** Principal still in: contributed minus withdrawn. */
  invested: number;
  /** Interest, dividends and profit received, reinvested or paid out. */
  returns: number;
  /** What's in the investment's wallet: put in, plus reinvested returns, minus taken out or written off. */
  book: number;
  /** What it is worth now — see `investmentValue`. */
  value: number;
  /** value + cash taken back + returns paid out − contributed. */
  gain: number;
  /** gain as a share of contributed (0.1 = 10%). */
  gainRate: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Whole months from `from` to `to` (both YYYY-MM-DD), never negative. */
function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0));
}

const byDate = (a: InvestmentEntry, b: InvestmentEntry) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

/** Money that stays in the investment's wallet: a contribution, a reinvested return — and what leaves it. */
function netIn(inv: Investment, list: InvestmentEntry[]): number {
  return list.reduce((sum, e) => {
    if (e.kind === "contribution") return sum + e.amount;
    if (e.kind === "return") return e.walletId !== null && e.walletId === inv.walletId ? sum + e.amount : sum;
    if (e.kind === "withdrawal" || e.kind === "writeoff") return sum - e.amount;
    return sum;
  }, 0);
}

/**
 * What the investment is worth on `asOf`:
 *  - closed (matured or sold) → 0;
 *  - the user's latest value update, plus what stayed in after it;
 *  - otherwise, for a rated type with no returns recorded, each contribution grown at the
 *    yearly rate (compounded monthly, stopping at maturity) minus what left — an estimate;
 *  - otherwise what's in its wallet: put in plus reinvested returns, minus what left.
 * Because a reinvested return stays in, later returns are measured on the larger total.
 */
export function investmentValue(inv: Investment, entries: InvestmentEntry[], asOf: string): number {
  if (inv.closedAt && asOf >= inv.closedAt.slice(0, 10)) return 0;
  const upTo = entries.filter((e) => e.date <= asOf).sort(byDate);

  const lastUpdate = [...upTo].reverse().find((e) => e.kind === "value_update");
  if (lastUpdate) {
    return round2(Math.max(0, lastUpdate.amount + netIn(inv, upTo.filter((e) => e.date > lastUpdate.date))));
  }

  const rate = inv.ratePercent ?? 0;
  if (RATED_TYPES.includes(inv.type) && rate > 0 && !upTo.some((e) => e.kind === "return")) {
    const until = inv.maturityDate && inv.maturityDate < asOf ? inv.maturityDate : asOf;
    const monthly = rate / 1200;
    const grown = upTo
      .filter((e) => e.kind === "contribution")
      .reduce((s, e) => s + e.amount * Math.pow(1 + monthly, monthsBetween(e.date, until)), 0);
    const left = upTo.filter((e) => e.kind === "withdrawal" || e.kind === "writeoff").reduce((s, e) => s + e.amount, 0);
    return round2(Math.max(0, grown - left));
  }
  return round2(Math.max(0, netIn(inv, upTo)));
}

export function summarizeInvestment(inv: Investment, entries: InvestmentEntry[], asOf: string): InvestmentSummary {
  const upTo = entries.filter((e) => e.date <= asOf);
  const total = (kind: InvestmentEntryKind) => round2(upTo.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0));
  const contributed = total("contribution");
  const withdrawn = total("withdrawal");
  const returns = total("return");
  const reinvested = round2(
    upTo.filter((e) => e.kind === "return" && e.walletId !== null && e.walletId === inv.walletId).reduce((s, e) => s + e.amount, 0),
  );
  const paidOut = round2(returns - reinvested);
  const value = investmentValue(inv, entries, asOf);
  const gain = round2(value + withdrawn + paidOut - contributed);
  return {
    contributed,
    withdrawn,
    invested: round2(Math.max(0, contributed - withdrawn)),
    returns,
    book: round2(Math.max(0, netIn(inv, upTo))),
    value,
    gain,
    gainRate: contributed > 0 ? gain / contributed : 0,
  };
}

export interface PortfolioItem {
  investment: Investment;
  entries: InvestmentEntry[];
  summary: InvestmentSummary;
}

export function buildPortfolio(investments: Investment[], entries: InvestmentEntry[], asOf: string): PortfolioItem[] {
  return investments.map((investment) => {
    const own = entries.filter((e) => e.investmentId === investment.id);
    return { investment, entries: own, summary: summarizeInvestment(investment, own, asOf) };
  });
}

export interface PortfolioTotals {
  invested: number;
  value: number;
  returns: number;
  gain: number;
  gainRate: number;
}

/** Totals over the investments still open — a closed one holds nothing now; its gain is kept in `realised`. */
export function portfolioTotals(items: PortfolioItem[]): PortfolioTotals & { realised: number } {
  const open = items.filter((i) => !i.investment.closedAt);
  const closed = items.filter((i) => i.investment.closedAt);
  const sum = (list: PortfolioItem[], pick: (s: InvestmentSummary) => number) => round2(list.reduce((t, i) => t + pick(i.summary), 0));
  const contributed = sum(open, (s) => s.contributed);
  const gain = sum(open, (s) => s.gain);
  return {
    invested: sum(open, (s) => s.invested),
    value: sum(open, (s) => s.value),
    returns: sum(open, (s) => s.returns),
    gain,
    gainRate: contributed > 0 ? gain / contributed : 0,
    realised: sum(closed, (s) => s.gain),
  };
}

/**
 * What open investments add to net worth on top of their wallets. A wallet only holds the book
 * amount (put in plus reinvested returns), so the rest of the value — a share price that went up,
 * a DPS's accrued interest — is added here. An investment with no wallet adds its whole value.
 */
export function netWorthAdjustment(items: PortfolioItem[]): number {
  return round2(
    items
      .filter((i) => !i.investment.closedAt)
      .reduce((sum, i) => sum + (i.investment.walletId ? i.summary.value - i.summary.book : i.summary.value), 0),
  );
}

export interface PortfolioPoint {
  year: number;
  month: number;
  invested: number;
  value: number;
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Month-end invested vs. value across all investments for the `months` months ending at `today`'s month. */
export function portfolioSeries(items: PortfolioItem[], today: string, months = 12): PortfolioPoint[] {
  const [ty, tm] = today.split("-").map(Number);
  return Array.from({ length: months }, (_, i) => {
    const total = ty * 12 + (tm - 1) - (months - 1 - i);
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    const end = lastDayOfMonth(year, month);
    const asOf = end > today ? today : end;
    let invested = 0;
    let value = 0;
    for (const item of items) {
      const s = summarizeInvestment(item.investment, item.entries, asOf);
      invested += s.invested;
      value += s.value;
    }
    return { year, month, invested: round2(invested), value: round2(value) };
  });
}

export interface InvestmentTaxFigures {
  /** Returns taxed at slab rates, by the tax box they belong in. */
  businessReturns: number;
  investmentReturns: number;
  /** Returns already taxed at source — shown to the user, never added to taxable income. */
  taxedAtSourceReturns: number;
  /** Contributions to rebate-eligible investments, by the tax box they belong in. */
  rebate: { dps: number; sanchayapatra: number; insurance: number; shares: number; other: number };
}

/** What the tax page prefills from investment entries dated within [start, end]. */
export function investmentTaxFigures(items: PortfolioItem[], start: string, end: string): InvestmentTaxFigures {
  const out: InvestmentTaxFigures = {
    businessReturns: 0,
    investmentReturns: 0,
    taxedAtSourceReturns: 0,
    rebate: { dps: 0, sanchayapatra: 0, insurance: 0, shares: 0, other: 0 },
  };
  for (const { investment: inv, entries } of items) {
    for (const e of entries) {
      if (e.date < start || e.date > end) continue;
      if (e.kind === "return") {
        if (inv.taxedAtSource) out.taxedAtSourceReturns += e.amount;
        else if (inv.type === "business") out.businessReturns += e.amount;
        else out.investmentReturns += e.amount;
      } else if (e.kind === "contribution" && inv.rebateEligible) {
        const box = inv.type === "dps" ? "dps" : inv.type === "sanchayapatra" ? "sanchayapatra" : inv.type === "insurance" ? "insurance" : inv.type === "shares" || inv.type === "mutual_fund" ? "shares" : "other";
        out.rebate[box] += e.amount;
      }
    }
  }
  return out;
}
