"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { InvestmentForm } from "./InvestmentForm";

export function CreateInvestmentButton({ label }: { label?: string }) {
  const t = useTranslations("Investments");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {label ?? t("add")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("newInvestment")}>
        <InvestmentForm
          onSuccess={(id) => {
            setOpen(false);
            if (id) router.push(`/investments/${id}`);
          }}
        />
      </Modal>
    </>
  );
}
