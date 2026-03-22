"use client";

import { useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";

const plans = [
  {
    id: "free",
    name: "Starter",
    monthly: { price: "$0", sub: "Always free" },
    yearly: { price: "$0", sub: "Always free" },
    features: [
      "10 Minutes",
      "Free Result Previews",
      "50MB Upload File Limit",
    ],
    highlighted: false,
  },
  {
    id: "basic",
    name: "Basic",
    monthly: { price: "$9.99", sub: "billed monthly" },
    yearly: { price: "$7.49", sub: "$90 billed annually" },
    features: [
      "100 Minutes/mo",
      "Result Downloads",
      "200MB Upload File Limit",
    ],
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: { price: "$19.99", sub: "billed monthly" },
    yearly: { price: "$14.99", sub: "$180 billed annually" },
    features: [
      "300 Minutes/mo",
      "Result Downloads",
      "200MB Upload File Limit",
      "Priority Processing",
    ],
    highlighted: false,
  },
];

export default function PricingPage() {
  const { profile } = useAuth();
  const userPlan = profile?.plan ?? "free";
  const [yearly, setYearly] = useState(false);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-4.5 w-4.5 text-primary" />
          </div>
          Pricing
        </h1>
        <p className="text-muted-foreground mt-2">
          1 minute of audio = 1 minute from your plan.
        </p>
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
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
              yearly ? "bg-muted text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            Annually
            <span className="text-[10px] font-semibold text-primary">Save 3 Months</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-xl border p-5 flex flex-col ${
              plan.highlighted
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/60 bg-card"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-3 py-1 rounded-full bg-primary text-primary-foreground whitespace-nowrap">
                MOST POPULAR
              </div>
            )}
            <h3 className="font-semibold">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {yearly ? plan.yearly.price : plan.monthly.price}
              </span>
              {plan.id !== "free" && (
                <span className="text-muted-foreground text-sm">/mo</span>
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
                Current Plan
              </div>
            ) : (
              <button
                onClick={() => toast.info("Payment integration coming soon.")}
                className={`mt-5 inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-muted"
                }`}
              >
                Subscribe
              </button>
            )}
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
        <h3 className="font-medium mb-3">How minutes work</h3>
        <p className="text-sm text-muted-foreground">
          1 minute of audio = 1 minute from your plan.
          <br />
          A 4-minute song uses 4 minutes. Use your minutes for any tool — MR, LRC, or both.
        </p>
      </div>
    </div>
  );
}
