import type { TransactionKind } from "./types";

export interface TransactionFilters {
  q?: string;
  kind?: TransactionKind | "all";
  category?: string;
  walletId?: string;
  /** Inclusive lower date bound (YYYY-MM-DD) — the `from` param and/or the start of the selected month. */
  from?: string;
  /** Inclusive upper date bound (YYYY-MM-DD) — the `to` param and/or the end of the selected month. */
  to?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** The `year`/`month` query params as a validated pair, or null when either is missing or out of range. */
export function parseMonthParams(
  searchParams: Record<string, string | string[] | undefined>
): { year: number; month: number } | null {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const year = Number(get("year"));
  const month = Number(get("month"));
  if (!Number.isInteger(year) || year < 1970 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

/** First and last day of a calendar month, as YYYY-MM-DD. */
export function monthBounds(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${year}-${pad2(month)}-01`, to: `${year}-${pad2(month)}-${pad2(lastDay)}` };
}

export function parseFilters(searchParams: Record<string, string | string[] | undefined>): TransactionFilters {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  // A selected month narrows the date range rather than replacing it, so a month plus a
  // from/to still intersect ("September, from the 10th") instead of one silently winning.
  // YYYY-MM-DD strings compare correctly as plain strings.
  let from = get("from") || undefined;
  let to = get("to") || undefined;
  const monthParams = parseMonthParams(searchParams);
  if (monthParams) {
    const bounds = monthBounds(monthParams.year, monthParams.month);
    if (!from || from < bounds.from) from = bounds.from;
    if (!to || to > bounds.to) to = bounds.to;
  }

  return {
    q: get("q") || undefined,
    kind: (get("kind") as TransactionKind | "all") || "all",
    category: get("category") || undefined,
    walletId: get("walletId") || undefined,
    from,
    to,
  };
}
