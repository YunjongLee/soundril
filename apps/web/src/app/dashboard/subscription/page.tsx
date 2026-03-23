"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/lib/i18n";
import { getPlanDisplayName, isPaidPlan } from "@/lib/plan";
import { Settings, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SubscriptionContent() {
  const { profile, productId } = useAuth();
  const { t, lang } = useT();
  const searchParams = useSearchParams();
  const isPaid = isPaidPlan(productId);
  const sub = profile?.subscription as {
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    status?: string;
  } | null;
  const [portalLoading, setPortalLoading] = useState(false);

  // 결제 성공 시 표시
  const success = searchParams.get("success");

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
      setPortalLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(lang, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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

      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 mb-6">
          <p className="text-sm text-green-400">{t("subscription.activated")}</p>
        </div>
      )}

      {/* Current Plan */}
      <div className="rounded-xl border border-border/60 bg-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("subscription.currentPlan")}</p>
            <p className="text-xl font-bold mt-1">{getPlanDisplayName(productId)}</p>
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
                <dt className="text-muted-foreground">{t("subscription.startDate")}</dt>
                <dd className="font-medium">{formatDate(sub?.currentPeriodStart)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("subscription.endDate")}</dt>
                <dd className="font-medium">{formatDate(sub?.currentPeriodEnd)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("subscription.status")}</dt>
                <dd className="font-medium capitalize">{sub?.status ?? "--"}</dd>
              </div>
            </dl>
          </div>

          {/* 다음 기간 플랜 변경 예정 */}
          {sub?.pendingUpdate?.productId && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-6">
              <p className="text-sm text-amber-400">
                {t("subscription.pendingChange", {
                  plan: getPlanDisplayName(sub.pendingUpdate.productId),
                  date: formatDate(sub.pendingUpdate.appliesAt),
                })}
              </p>
            </div>
          )}

          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-10 px-6 transition-colors"
          >
            {t("subscription.managePlan")}
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
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

export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionContent />
    </Suspense>
  );
}
