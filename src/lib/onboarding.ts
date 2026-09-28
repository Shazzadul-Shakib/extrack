import { createWallet } from "./mutations";

/** The starter wallets every new account gets, however it signed up (password or Google). */
export async function createStarterWallets(userId: string): Promise<void> {
  await Promise.all([
    createWallet(userId, { name: "Cash", type: "cash", balance: 0, currency: "BDT", note: "" }),
    createWallet(userId, { name: "Main Bank", type: "bank", balance: 0, currency: "BDT", note: "" }),
    createWallet(userId, { name: "Savings", type: "savings", balance: 0, currency: "BDT", note: "" }),
    createWallet(userId, { name: "Credit Card", type: "debt", balance: 0, currency: "BDT", note: "" }),
  ]);
}
