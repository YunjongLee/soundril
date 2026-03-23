"use client";

import { useState, useEffect } from "react";
import { Check, CreditCard, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/lib/i18n";
import { getPlanName } from "@/lib/plan";
import { toast } from "sonner";
import { Waveform } from "@/components/waveform";
const PLAN_CREDITS: Record<string, { monthly: number; yearly: number }> = {
  basic: { monthly: 100, yearly: 1200 },
  pro: { monthly: 300, yearly: 3600 },
};

export default function PricingPage() {
  const { profile, productId: currentProductId } = useAuth();
  const { t } = useT();
  const userPlan = getPlanName(currentProductId);
  const isCurrentYearly = profile?.subscription?.currentPeriodStart && profile?.subscription?.currentPeriodEnd
    ? (new Date(profile.subscription.currentPeriodEnd).getTime() - new Date(profile.subscription.currentPeriodStart).getTime()) > 60 * 24 * 60 * 60 * 1000
    : false;
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null);

  // 뒤로가기로 돌아왔을 때 로딩 상태 초기화
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(null);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const plans = [
    {
      id: "free",
      name: t("pricing.starter"),
      monthly: { price: "$0", sub: t("pricing.alwaysFree"), productId: "" },
      yearly: { price: "$0", sub: t("pricing.alwaysFree"), productId: "" },
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
      monthly: { price: "$9.99", sub: t("pricing.billedMonthly"), productId: process.env.NEXT_PUBLIC_POLAR_BASIC_MONTHLY_PRODUCT_ID ?? "" },
      yearly: { price: "$7.50", sub: t("pricing.billedAnnually90"), productId: process.env.NEXT_PUBLIC_POLAR_BASIC_YEARLY_PRODUCT_ID ?? "" },
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
      monthly: { price: "$19.99", sub: t("pricing.billedMonthly"), productId: process.env.NEXT_PUBLIC_POLAR_PRO_MONTHLY_PRODUCT_ID ?? "" },
      yearly: { price: "$15", sub: t("pricing.billedAnnually180"), productId: process.env.NEXT_PUBLIC_POLAR_PRO_YEARLY_PRODUCT_ID ?? "" },
      features: [
        yearly ? t("pricing.minutes3600") : t("pricing.minutes300"),
        t("pricing.resultDownloads"),
        t("pricing.upload200MB"),
        t("pricing.priorityProcessing"),
      ],
      highlighted: false,
    },
  ];

  const hasSubscription = !!currentProductId;

  const handleClick = (planId: string) => {
    if (hasSubscription) {
      setConfirmPlan(planId);
    } else {
      handleSubscribe(planId);
    }
  };

  const currentCredits = PLAN_CREDITS[userPlan]?.[isCurrentYearly ? "yearly" : "monthly"] ?? 0;
  const confirmCredits = confirmPlan ? (PLAN_CREDITS[confirmPlan]?.[yearly ? "yearly" : "monthly"] ?? 0) : 0;
  const additionalCredits = Math.max(0, confirmCredits - currentCredits);

  const handleSubscribe = async (planId: string) => {
    if (planId === "free") return;
    setConfirmPlan(null);
    setLoading(planId);
    try {
      if (hasSubscription) {
        // 기존 구독자 → 플랜/주기 변경
        const res = await fetch("/api/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: planId,
            period: yearly ? "yearly" : "monthly",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success(t("pricing.planUpdated"));
        setLoading(null);
      } else {
        // 신규 → 체크아웃
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: planId,
            period: yearly ? "yearly" : "monthly",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
      setLoading(null);
    }
  };

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

            <div className={`mt-5 h-9 transition-opacity duration-300 ${profile ? "opacity-100" : "opacity-0"}`}>
              {((plan.id === "free" && userPlan === "free") ||
               (currentProductId && currentProductId === (yearly ? plan.yearly.productId : plan.monthly.productId))) ? (
                <div className="inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 border border-border text-muted-foreground cursor-default w-full">
                  {t("pricing.currentPlan")}
                </div>
              ) : plan.id === "free" ||
                 (PLAN_CREDITS[plan.id]?.[yearly ? "yearly" : "monthly"] ?? 0) <= currentCredits ? null : (
                <button
                  onClick={() => handleClick(plan.id)}
                  disabled={loading !== null}
                  className={`w-full inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 transition-colors disabled:opacity-50 ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {loading === plan.id ? (
                    <Waveform bars={3} size="sm" className="!h-2" barClassName="bg-primary-foreground/60" />
                  ) : (
                    t("pricing.subscribe")
                  )}
                </button>
              )}
            </div>
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

      {/* 확인 모달 */}
      {confirmPlan && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setConfirmPlan(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border/60 rounded-xl p-6 max-w-[410px] w-full shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{t("pricing.confirmTitle")}</h3>
                <button onClick={() => setConfirmPlan(null)} className="p-1 rounded hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <dl className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("pricing.confirmFrom")}</dt>
                  <dd className="font-medium capitalize">{userPlan} ({isCurrentYearly ? t("pricing.annually") : t("pricing.monthly")})</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("pricing.confirmTo")}</dt>
                  <dd className="font-medium capitalize">{confirmPlan} ({yearly ? t("pricing.annually") : t("pricing.monthly")})</dd>
                </div>
                <div className="border-t border-border/40 pt-2 flex justify-between">
                  <dt className="text-muted-foreground">{t("pricing.confirmCredits")}</dt>
                  <dd className="font-medium text-primary">+{additionalCredits.toLocaleString()}</dd>
                </div>
              </dl>

              <p className="text-xs text-muted-foreground mb-4">
                {t("pricing.confirmProration")}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmPlan(null)}
                  className="flex-1 rounded-lg text-sm font-medium h-9 border border-border hover:bg-muted transition-colors"
                >
                  {t("pricing.confirmCancel")}
                </button>
                <button
                  onClick={() => handleSubscribe(confirmPlan)}
                  className="flex-1 rounded-lg text-sm font-medium h-9 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {t("pricing.confirmApply")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
