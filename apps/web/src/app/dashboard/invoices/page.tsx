"use client";

import { useT } from "@/lib/i18n";
import { Receipt } from "lucide-react";

export default function InvoicesPage() {
  const { t } = useT();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Receipt className="h-4.5 w-4.5 text-primary" />
          </div>
          {t("invoices.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("invoices.subtitle")}
        </p>
      </div>

      <div className="text-center py-16 rounded-xl border border-border/60 bg-card">
        <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">{t("invoices.noInvoices")}</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          {t("invoices.noInvoicesDesc")}
        </p>
      </div>
    </div>
  );
}
