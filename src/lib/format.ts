import type { WalletType } from "./types";

/** Minimal shape of a next-intl translator — enough to call it without depending on its generics here. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

// Maps an app locale to the full Intl locale used for every number/date formatter below —
// this is what actually switches digits (0123... vs ০১২৩...), month names, and compact-number
// units (K/M vs লা/কো) together, in one place.
const INTL_LOCALE: Record<string, string> = {
  en: "en-US",
  bn: "bn-BD",
};

function resolveIntlLocale(locale: string): string {
  return INTL_LOCALE[locale] ?? INTL_LOCALE.en;
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(amount: number, currency = "BDT", locale = "en"): string {
  const cacheKey = `${locale}:${currency}`;
  let formatter = currencyFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(resolveIntlLocale(locale), {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    });
    currencyFormatterCache.set(cacheKey, formatter);
  }
  return formatter.format(amount);
}

const compactCurrencyFormatterCache = new Map<string, Intl.NumberFormat>();

/** Compact form for stat tiles: 1,284 / 12.9K / ৳4.2M (or, in Bangla, the native লাখ/কোটি units) */
export function formatCompactCurrency(amount: number, currency = "BDT", locale = "en"): string {
  const abs = Math.abs(amount);
  if (abs < 100_000) return formatCurrency(amount, currency, locale);
  const cacheKey = `${locale}:${currency}`;
  let formatter = compactCurrencyFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(resolveIntlLocale(locale), {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: "compact",
      maximumFractionDigits: 1,
    });
    compactCurrencyFormatterCache.set(cacheKey, formatter);
  }
  return formatter.format(amount);
}

const numberFormatterCache = new Map<string, Intl.NumberFormat>();

// ICU messages interpolate a bare `{value}` as a plain string, not through Intl — the
// special auto-formatting only applies to the `#` shorthand inside a `plural` branch.
// Any raw number handed to a translator (years, percentages, counts outside of a plural
// clause) needs to be pre-formatted through this first, or it stays in Latin digits in bn.
export function formatNumber(value: number, locale = "en"): string {
  let formatter = numberFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(resolveIntlLocale(locale), { maximumFractionDigits: 0 });
    numberFormatterCache.set(locale, formatter);
  }
  return formatter.format(value);
}

const compactNumberFormatterCache = new Map<string, Intl.NumberFormat>();

/** Bare compact number, no currency — for chart axis ticks: 5K / 1.5M, or লাখ/কোটি units in Bangla. */
export function formatCompactNumber(value: number, locale = "en"): string {
  let formatter = compactNumberFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(resolveIntlLocale(locale), { notation: "compact", maximumFractionDigits: 1 });
    compactNumberFormatterCache.set(locale, formatter);
  }
  return formatter.format(value);
}

/** Label for a wallet picker option — what's on hand, or what's owed for a debt wallet. `t` is the "Wallets" translator. */
export function walletBalanceLabel(
  wallet: { type: WalletType; balance: number; currency: string },
  t: Translator,
  locale = "en",
): string {
  const amount = formatCurrency(wallet.balance, wallet.currency, locale);
  const key = wallet.type === "debt" ? "owesAmount" : wallet.type === "lend" ? "lentAmount" : "amountAvailable";
  return t(key, { amount });
}

export function formatDate(iso: string, locale = "en"): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(resolveIntlLocale(locale), { month: "long", day: "numeric", year: "numeric" });
}

export function formatDateShort(iso: string, locale = "en"): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(resolveIntlLocale(locale), { month: "short", day: "numeric" });
}

const monthNamesCache = new Map<string, string[]>();

export function getMonthNames(locale = "en"): string[] {
  let names = monthNamesCache.get(locale);
  if (!names) {
    const formatter = new Intl.DateTimeFormat(resolveIntlLocale(locale), { month: "long" });
    names = Array.from({ length: 12 }, (_, i) => formatter.format(new Date(2000, i, 1)));
    monthNamesCache.set(locale, names);
  }
  return names;
}

export function monthLabel(month: number, locale = "en"): string {
  return getMonthNames(locale)[month - 1] ?? "";
}

const shortMonthNamesCache = new Map<string, string[]>();

/**
 * Short month form for compact labels (chart ticks, "vs Sep 2026"). Not a naive slice of the
 * full name — Bengali is a complex script where cutting mid-conjunct (e.g. "এপ্" for April)
 * leaves a dangling virama that reads as broken text, so this goes through Intl's own
 * "short" formatting instead.
 */
export function getShortMonthNames(locale = "en"): string[] {
  let names = shortMonthNamesCache.get(locale);
  if (!names) {
    const formatter = new Intl.DateTimeFormat(resolveIntlLocale(locale), { month: "short" });
    names = Array.from({ length: 12 }, (_, i) => formatter.format(new Date(2000, i, 1)));
    shortMonthNamesCache.set(locale, names);
  }
  return names;
}

export function monthLabelShort(month: number, locale = "en"): string {
  return getShortMonthNames(locale)[month - 1] ?? "";
}

export function todayIso(): string {
  // Built from local date parts rather than toISOString(), which reads back in UTC and
  // reports yesterday's date for part of the day in any timezone ahead of it.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Adds `delta` months to a {year, month} pair, wrapping year as needed. */
export function shiftYearMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
