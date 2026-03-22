"use client";

import { useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

export default function PricingPage() {
  const { profile } = useAuth();
  const { t } = useT();
  const userPlan = profile?.plan ?? "free";
  const [yearly, setYearly] = useState(false);

  const plans = [
    {
      id: "free",
      name: t("pricing.starter"),
      monthly: { price: "$0", sub: t("pricing.alwaysFree") },
      yearly: { price: "$0", sub: t("pricing.alwaysFree") },
      features: [
        t("pricing.minutes10"),
        t("pricing.freeResultPreviews"),
        t("pricing.upload50MB"),
      ],
      highlighted: false,
    },
    {
      id: "basic",
      name: t("pricing.basic"),
      monthly: { price: "$9.99", sub: t("pricing.billedMonthly") },
      yearly: { price: "$7.49", sub: t("pricing.billedAnnually90") },
      features: [
        yearly ? t("pricing.minutes1200") : t("pricing.minutes100"),
        t("pricing.resultDownloads"),
        t("pricing.upload200MB"),
      ],
      highlighted: true,
    },
    {
      id: "pro",
      name: t("pricing.pro"),
      monthly: { price: "$19.99", sub: t("pricing.billedMonthly") },
      yearly: { price: "$14.99", sub: t("pricing.billedAnnually180") },
      features: [
        yearly ? t("pricing.minutes3600") : t("pricing.minutes300"),
        t("pricing.resultDownloads"),
        t("pricing.upload200MB"),
        t("pricing.priorityProcessing"),
      ],
      highlighted: false,
    },
  ];

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-4.5 w-4.5 text-primary" />
          </div>
          {t("pricing.title")}
        </h1>
      </div>

      {/* Monthly / Annually toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center rounded-full border border-border/60 bg-card p-1 text-sm">
          <button
            onClick={() => setYearly(false)}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              !yearly ? "bg-muted text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            {t("pricing.monthly")}
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
              yearly ? "bg-muted text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            {t("pricing.annually")}
            <span className="text-[10px] font-semibold text-primary">{t("pricing.save3Months")}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border p-5 flex flex-col ${
              plan.highlighted
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/60 bg-card"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-3 py-1 rounded-full bg-primary text-primary-foreground whitespace-nowrap">
                {t("pricing.mostPopular")}
              </div>
            )}
            <h3 className="font-semibold">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {yearly ? plan.yearly.price : plan.monthly.price}
              </span>
              {plan.id !== "free" && (
                <span className="text-muted-foreground text-sm">{t("pricing.perMonth")}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {yearly ? plan.yearly.sub : plan.monthly.sub}
            </p>

            <ul className="mt-5 space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {userPlan === plan.id ? (
              <div className="mt-5 inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 border border-border text-muted-foreground cursor-default">
                {t("pricing.currentPlan")}
              </div>
            ) : (
              <button
                onClick={() => toast.info(t("pricing.paymentComingSoon"))}
                className={`mt-5 inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {t("pricing.subscribe")}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
        <h3 className="font-medium mb-3">{t("pricing.howMinutesWork")}</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {t("pricing.howMinutesWorkDesc")}
        </p>
      </div>
    </div>
  );
}
