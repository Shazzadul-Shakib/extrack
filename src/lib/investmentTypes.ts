import { BadgeCheck, Briefcase, CircleDollarSign, Landmark, LineChart, PiggyBank, PieChart, ScrollText, ShieldCheck, type LucideIcon } from "lucide-react";
import type { InvestmentType } from "./investments";

/** Icon and fixed chart-colour slot (1-8) for each investment type — assigned once, like categories. */
export const INVESTMENT_TYPE_META: Record<InvestmentType, { icon: LucideIcon; slot: number }> = {
  dps: { icon: PiggyBank, slot: 3 },
  fdr: { icon: Landmark, slot: 1 },
  sanchayapatra: { icon: BadgeCheck, slot: 4 },
  insurance: { icon: ShieldCheck, slot: 5 },
  shares: { icon: LineChart, slot: 2 },
  mutual_fund: { icon: PieChart, slot: 6 },
  bond: { icon: ScrollText, slot: 7 },
  business: { icon: Briefcase, slot: 8 },
  other: { icon: CircleDollarSign, slot: 8 },
};
