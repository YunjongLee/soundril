"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Receipt, FileText } from "lucide-react";

interface Invoice {
  id: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  currency: string;
  billingReason: string;
}

export default function InvoicesPage() {
  const { t, lang } = useT();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => setInvoices(data.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(lang, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const reasonLabel = (reason: string) => {
    switch (reason) {
      case "subscription_create": return t("invoices.reasonNew");
      case "subscription_cycle": return t("invoices.reasonRenewal");
      case "subscription_update": return t("invoices.reasonUpdate");
      default: return reason;
    }
  };

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

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border/60 bg-card">
          <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">{t("invoices.noInvoices")}</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {t("invoices.noInvoicesDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{reasonLabel(invoice.billingReason)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(invoice.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(invoice.totalAmount, invoice.currency)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{invoice.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
