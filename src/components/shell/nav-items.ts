import { CreditCard, HandCoins, LayoutDashboard, PiggyBank, Receipt, ShieldCheck, Sparkles, Target, Wallet } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/wallets", key: "wallets", icon: Wallet },
  { href: "/transactions", key: "transactions", icon: Receipt },
  { href: "/budgets", key: "budgets", icon: Target },
  { href: "/savings", key: "savings", icon: PiggyBank },
  { href: "/lend", key: "lend", icon: HandCoins },
  { href: "/debts", key: "debts", icon: CreditCard },
  { href: "/updates", key: "updates", icon: Sparkles },
  /** Admin-only — the shell drops it for everyone else, and the routes behind it check again. */
  { href: "/admin", key: "admin", icon: ShieldCheck },
] as const;
