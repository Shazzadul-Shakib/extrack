export interface ExtractedItem {
  label: string;
  amount: number;
}

export interface ExtractedCategoryGroup {
  category: string;
  amount: number;
  note: string;
  items: ExtractedItem[];
}

export interface ExtractReceiptResult {
  merchant: string | null;
  date: string | null;
  groups: ExtractedCategoryGroup[];
}
