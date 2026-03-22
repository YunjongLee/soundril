"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/lib/i18n";
import { Settings, ArrowRight } from "lucide-react";

export default function SubscriptionPage() {
  const { profile } = useAuth();
  const { t } = useT();
  const plan = profile?.plan ?? "free";
  const isPaid = plan === "basic" || plan === "pro";

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="h-4.5 w-4.5 text-primary" />
          </div>
          {t("subscription.title")}
        </h1>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl border border-border/60 bg-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("subscription.currentPlan")}</p>
            <p className="text-xl font-bold mt-1 capitalize">{plan === "free" ? t("pricing.starter") : plan === "basic" ? t("pricing.basic") : t("pricing.pro")}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t("dashboard.minutesRemaining")}</p>
            <p className="text-xl font-bold mt-1 text-primary">{profile?.credits ?? "--"}</p>
          </div>
        </div>
      </div>

      {isPaid ? (
        <>
          {/* Paid plan info */}
          <div className="rounded-xl border border-border/60 bg-card p-6 mb-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("subscription.billingCycle")}</dt>
                <dd className="font-medium">--</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("subscription.startDate")}</dt>
                <dd className="font-medium">--</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("subscription.endDate")}</dt>
                <dd className="font-medium">--</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("subscription.nextBilling")}</dt>
                <dd className="font-medium">--</dd>
              </div>
            </dl>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/pricing"
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 transition-colors"
            >
              {t("subscription.managePlan")}
            </Link>
            <button
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted h-10 px-6 transition-colors"
            >
              {t("subscription.cancelSubscription")}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Free plan prompt */}
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <p className="text-sm text-muted-foreground">{t("subscription.free")}</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{t("subscription.freeDesc")}</p>
            <Link
              href="/dashboard/pricing"
              className="inline-flex items-center gap-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 transition-colors mt-4"
            >
              {t("subscription.upgradePlan")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
