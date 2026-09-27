"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createBudget, updateBudget, deleteBudget, copyBudgets, MutationError } from "@/lib/mutations";
import { currentYearMonth } from "@/lib/format";

export interface BudgetFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseInput(formData: FormData) {
  const category = str(formData, "category");
  const amountRaw = str(formData, "amount");
  const amount = Number(amountRaw);
  const defaults = currentYearMonth();
  const year = Number(str(formData, "year")) || defaults.year;
  const month = Number(str(formData, "month")) || defaults.month;
  const note = str(formData, "note");

  const fieldErrors: Record<string, string> = {};
  if (!category) fieldErrors.category = "Pick a category.";
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) fieldErrors.amount = "Enter an amount greater than 0.";
  if (!Number.isInteger(month) || month < 1 || month > 12) fieldErrors.month = "Pick a valid month.";
  if (!Number.isInteger(year) || year < 2000 || year > 2100) fieldErrors.year = "Pick a valid year.";

  return { input: { category, amount, year, month, note }, fieldErrors };
}

function revalidateBudgetPaths() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function createBudgetAction(
  _prevState: BudgetFormState,
  formData: FormData
): Promise<BudgetFormState> {
  const user = await requireUser();
  const { input, fieldErrors } = parseInput(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await createBudget(user.id, input);
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not save this budget." };
  }

  revalidateBudgetPaths();
  return { success: true };
}

export async function updateBudgetAction(
  budgetId: string,
  _prevState: BudgetFormState,
  formData: FormData
): Promise<BudgetFormState> {
  const user = await requireUser();
  const { input, fieldErrors } = parseInput(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await updateBudget(user.id, budgetId, input);
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not update this budget." };
  }

  revalidateBudgetPaths();
  return { success: true };
}

export async function deleteBudgetAction(budgetId: string): Promise<void> {
  const user = await requireUser();
  try {
    await deleteBudget(user.id, budgetId);
  } catch {
    // Already gone — nothing to do.
  }
  revalidateBudgetPaths();
}

export interface CopyBudgetsFormState {
  error?: string;
  success?: boolean;
  copied?: number;
  skipped?: number;
}

export async function copyBudgetsAction(
  toYear: number,
  toMonth: number,
  _prevState: CopyBudgetsFormState,
  formData: FormData
): Promise<CopyBudgetsFormState> {
  const user = await requireUser();
  const [fromYearRaw, fromMonthRaw] = str(formData, "source").split("-");
  const fromYear = Number(fromYearRaw);
  const fromMonth = Number(fromMonthRaw);

  if (!Number.isInteger(fromYear) || !Number.isInteger(fromMonth) || fromMonth < 1 || fromMonth > 12) {
    return { error: "Pick a month to copy from." };
  }

  try {
    const result = await copyBudgets(user.id, { fromYear, fromMonth, toYear, toMonth });
    revalidateBudgetPaths();
    return { success: true, copied: result.copied, skipped: result.skipped };
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not copy that month's budget." };
  }
}
