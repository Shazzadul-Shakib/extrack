import { EXPENSE_CATEGORIES } from "@/lib/categories";

/** Debt/Savings/Lend are excluded — those are special transfer-triggering categories in the
 *  manual transaction form, not something a shopping receipt should ever be tagged with. */
export const RECEIPT_CATEGORY_NAMES = EXPENSE_CATEGORIES.map((c) => c.name).filter(
  (name) => name !== "Debt" && name !== "Savings" && name !== "Lend"
);
const CATEGORY_NAMES = RECEIPT_CATEGORY_NAMES;

const RESPONSE_SCHEMA = `{
  "merchant": string | null,
  "date": string | null, // YYYY-MM-DD if printed on the receipt, else null
  "groups": [
    {
      "category": string, // must be exactly one of the allowed category names
      "note": string, // short summary of this group, e.g. "Groceries"
      "items": [ { "label": string, "amount": number } ]
    }
  ]
}`;

export function buildExtractionPrompt(): { system: string; userInstruction: string } {
  const system = [
    "You read photos of shopping/bazar lists and receipts and extract line items so they can be logged as expenses.",
    `Every item must be assigned to exactly one of these categories: ${CATEGORY_NAMES.join(", ")}. If nothing fits, use "Other".`,
    "Group the items by category: output exactly one group per category that appears on the receipt.",
    "Never output one group for the whole receipt, and never output one group per line item — group strictly by category.",
    "Respond with JSON only, matching this shape exactly, with no markdown fences and no commentary:",
    RESPONSE_SCHEMA,
  ].join("\n");

  const userInstruction =
    "Read this receipt or shopping list image and return the grouped JSON extraction described in the system prompt.";

  return { system, userInstruction };
}
