// Resets one account to a demo dataset covering every feature. Usage:
//   node --env-file=.env scripts/seed-demo.mjs <email>
// Deletes that account's wallets (and their transactions) and budgets first — only that user's rows.
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const email = process.argv[2];
if (!email) throw new Error("Pass the account email.");
const prisma = new PrismaClient();
const id = (p) => `${p}_${randomUUID().replace(/-/g, "")}`;

// Dates are relative to today so the dashboard's "this month" is always populated.
const now = new Date();
const ym = (back) => {
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
};
const day = (back, dd) => {
  const { y, m } = ym(back);
  return `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
};

const W = {
  cash: { name: "Cash in Hand", type: "cash", balance: 0 },
  bank: { name: "City Bank", type: "bank", balance: 0 },
  savings: { name: "Emergency Fund", type: "savings", balance: 0 },
  lend: { name: "Lent to Rahim", type: "lend", balance: 0 },
  debt: { name: "Bike Loan", type: "debt", balance: 20000, note: "Owed to Dutch-Bangla" },
};
for (const [k, w] of Object.entries(W)) Object.assign(w, { key: k, id: id("wal") });

// [monthsBack, day, kind, category, amount, from, to?, note]
const T = [
  // two months ago
  [2, 1, "income", "Salary", 45000, "bank", null, "Monthly salary"],
  [2, 2, "transfer", "Transfer", 10000, "bank", "cash", "Cash withdrawal"],
  [2, 3, "expense", "Rent", 15680, "bank", null, "Flat rent"],
  [2, 5, "transfer", "Savings", 5000, "bank", "savings", "Start emergency fund"],
  [2, 8, "expense", "Food & Dining", 6500, "cash", null, "Groceries & meals"],
  [2, 12, "expense", "Bills & Utilities", 6800, "bank", null, "Electricity, gas, internet"],
  // last month
  [1, 1, "income", "Salary", 45000, "bank", null, "Monthly salary"],
  [1, 2, "transfer", "Transfer", 8000, "bank", "cash", "Cash withdrawal"],
  [1, 3, "expense", "Rent", 15680, "bank", null, "Flat rent"],
  [1, 4, "income", "Freelance", 8000, "bank", null, "Logo design project"],
  [1, 6, "transfer", "Savings", 7000, "bank", "savings", "Monthly saving"],
  [1, 9, "expense", "Food & Dining", 8100, "cash", null, "Groceries & meals"],
  [1, 11, "expense", "Bills & Utilities", 7200, "bank", null, "Electricity, gas, internet"],
  [1, 12, "transfer", "Lend", 3000, "bank", "lend", "Lent to Rahim"],
  [1, 15, "expense", "Shopping", 3500, "bank", null, "New shoes"],
  [1, 18, "expense", "Transport", 900, "cash", null, "Rides"],
  [1, 20, "transfer", "Debt", 2000, "bank", "debt", "Bike loan instalment"],
  [1, 24, "expense", "Entertainment", 1200, "cash", null, "Movie night"],
  // this month
  [0, 1, "income", "Salary", 45000, "bank", null, "Monthly salary"],
  [0, 2, "transfer", "Transfer", 12000, "bank", "cash", "Cash withdrawal"],
  [0, 3, "expense", "Rent", 15680, "bank", null, "Flat rent"],
  [0, 4, "expense", "Bills & Utilities", 7660, "bank", null, "Electricity, gas, internet"],
  [0, 5, "transfer", "Savings", 9000, "bank", "savings", "Saved this month"],
  [0, 7, "expense", "Food & Dining", 8920, "cash", null, "Groceries & meals"],
  [0, 9, "expense", "Transport", 1680, "cash", null, "Rides & fuel"],
  [0, 11, "income", "Freelance", 6000, "bank", null, "Website project"],
  [0, 13, "expense", "Other", 2110, "cash", null, "Miscellaneous"],
  [0, 14, "expense", "Health", 2500, "bank", null, "Doctor visit"],
  [0, 16, "expense", "Health", 4200, "savings", null, "Dental surgery, paid from emergency fund"],
  [0, 18, "transfer", "Transfer", 1500, "savings", "bank", "Moved back from savings"],
  [0, 20, "transfer", "Transfer", 1000, "lend", "bank", "Rahim paid back part"],
  [0, 22, "transfer", "Debt", 2500, "bank", "debt", "Bike loan instalment"],
];

const delta = (type, kind, amt) => {
  const debt = type === "debt";
  return kind === "expense" ? (debt ? amt : -amt) : debt ? -amt : amt;
};
const txRows = T.map(([back, dd, kind, category, amount, from, to, note]) => {
  const src = W[from];
  const dst = to ? W[to] : null;
  src.balance += delta(src.type, kind === "income" ? "income" : "expense", amount);
  if (dst) dst.balance += delta(dst.type, "income", amount);
  return {
    id: id("txn"),
    kind,
    category,
    amount,
    date: new Date(day(back, dd)),
    note,
    walletId: src.id,
    toWalletId: dst?.id ?? null,
  };
});
for (const w of Object.values(W)) if (w.balance < 0) throw new Error(`${w.name} went negative: ${w.balance}`);

const B = (back, category, amount) => ({ year: ym(back).y, month: ym(back).m, category, amount });
const budgets = [
  B(0, "Rent", 15680), B(0, "Food & Dining", 8000), B(0, "Bills & Utilities", 7730), B(0, "Savings", 7000),
  B(0, "Health", 4000), B(0, "Other", 3000), B(0, "Transport", 500), B(0, "Debt", 3000),
  B(1, "Rent", 15680), B(1, "Food & Dining", 9000), B(1, "Bills & Utilities", 7500), B(1, "Savings", 7000),
  B(1, "Shopping", 3000), B(1, "Transport", 1500),
];

const user = await prisma.user.findUnique({ where: { email } });
if (!user) throw new Error(`No user ${email}`);

await prisma.$transaction(async (tx) => {
  await tx.budget.deleteMany({ where: { userId: user.id } });
  await tx.wallet.deleteMany({ where: { userId: user.id } }); // cascades to transactions
  await tx.wallet.createMany({
    data: Object.values(W).map((w) => ({ id: w.id, userId: user.id, name: w.name, type: w.type, balance: w.balance, note: w.note ?? "" })),
  });
  await tx.transaction.createMany({ data: txRows.map((t) => ({ ...t, userId: user.id })) });
  await tx.budget.createMany({ data: budgets.map((b) => ({ id: id("bud"), userId: user.id, ...b })) });
}, { timeout: 60000, maxWait: 20000 });

console.log("Seeded", { wallets: Object.keys(W).length, transactions: txRows.length, budgets: budgets.length });
for (const w of Object.values(W)) console.log(` ${w.name}: ${w.balance}`);
await prisma.$disconnect();
