import { RECEIPT_CATEGORY_NAMES } from "./prompt";
import { LlmExtractionError } from "./errors";
import type { ExtractedCategoryGroup, ExtractedItem, ExtractReceiptResult } from "./types";

const MAX_GROUPS = 20;
const MAX_ITEMS_PER_GROUP = 50;
const CATEGORY_SET = new Set(RECEIPT_CATEGORY_NAMES);

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function parseItem(raw: unknown): ExtractedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const label = typeof (raw as Record<string, unknown>).label === "string" ? (raw as Record<string, unknown>).label as string : "";
  const amountRaw = (raw as Record<string, unknown>).amount;
  const amount = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { label: label.slice(0, 140) || "Item", amount };
}

function parseGroup(raw: unknown): ExtractedCategoryGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const rawCategory = typeof obj.category === "string" ? obj.category : "";
  const category = CATEGORY_SET.has(rawCategory) ? rawCategory : "Other";
  const note = typeof obj.note === "string" ? obj.note.slice(0, 140) : "";

  const itemsRaw = Array.isArray(obj.items) ? obj.items : [];
  const items = itemsRaw
    .map(parseItem)
    .filter((item): item is ExtractedItem => item !== null)
    .slice(0, MAX_ITEMS_PER_GROUP);
  if (items.length === 0) return null;

  // The group's amount is always the sum of its items — never trusted directly from the model.
  const amount = items.reduce((sum, item) => sum + item.amount, 0);
  return { category, note, amount, items };
}

export function parseExtractionResponse(raw: string): ExtractReceiptResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new LlmExtractionError("malformed_response", "Couldn't read the extraction result.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new LlmExtractionError("malformed_response", "Couldn't read the extraction result.");
  }

  const obj = parsed as Record<string, unknown>;
  const merchant = typeof obj.merchant === "string" ? obj.merchant.slice(0, 140) : null;
  const date = typeof obj.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : null;

  const groupsRaw = Array.isArray(obj.groups) ? obj.groups : [];
  const groups = groupsRaw
    .map(parseGroup)
    .filter((group): group is ExtractedCategoryGroup => group !== null)
    .slice(0, MAX_GROUPS);

  if (groups.length === 0) {
    throw new LlmExtractionError("malformed_response", "Couldn't find any expenses on that receipt.");
  }

  return { merchant, date, groups };
}
