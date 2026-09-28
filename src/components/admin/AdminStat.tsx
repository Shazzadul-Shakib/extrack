import { Card } from "@/components/ui";

/** A headline number for the admin overview — a count, not money, so it's not a `StatCard`. */
export function AdminStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1.5 p-4">
      <span className="text-[13px] font-medium text-text-secondary">{label}</span>
      <span className="text-2xl font-semibold tracking-tight text-text-primary tabular-nums">{value}</span>
      {hint && <span className="text-[12.5px] text-text-muted">{hint}</span>}
    </Card>
  );
}
