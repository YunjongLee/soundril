"use client";

import { Check, CreditCard } from "lucide-react";
import { toast } from "sonner";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    credits: "10 credits",
    description: "Try it out",
    features: ["10 credits on signup", "MR extraction", "LRC generation"],
    highlighted: false,
  },
  {
    name: "Basic",
    price: "$9",
    period: "/mo",
    credits: "60 credits/month",
    description: "For casual users",
    features: [
      "60 credits/month",
      "MR extraction",
      "LRC generation",
      "Priority processing",
    ],
    highlighted: false,
  },
  {
    name: "Standard",
    price: "$19",
    period: "/mo",
    credits: "200 credits/month",
    description: "Most popular",
    features: [
      "200 credits/month",
      "MR extraction",
      "LRC generation",
      "Priority processing",
    ],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$39",
    period: "/mo",
    credits: "500 credits/month",
    description: "For power users",
    features: [
      "500 credits/month",
      "MR extraction",
      "LRC generation",
      "Priority processing",
      "Bulk processing",
    ],
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-4.5 w-4.5 text-primary" />
          </div>
          Pricing
        </h1>
        <p className="text-muted-foreground mt-2">
          1 credit = 1 minute of audio processing.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border p-5 flex flex-col ${
              plan.highlighted
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/60 bg-card"
            }`}
          >
            {plan.highlighted && (
              <div className="text-xs font-medium text-primary mb-2">
                MOST POPULAR
              </div>
            )}
            <h3 className="font-semibold">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">{plan.price}</span>
              <span className="text-muted-foreground text-sm">
                {plan.period}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {plan.credits}
            </p>

            <ul className="mt-5 space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => toast.info("Payment integration coming soon.")}
              className={`mt-5 inline-flex items-center justify-center rounded-lg text-sm font-medium h-9 transition-colors ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border hover:bg-muted"
              }`}
            >
              {plan.price === "$0" ? "Current Plan" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>

      {/* Credit usage info */}
      <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
        <h3 className="font-medium mb-3">How credits work</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium">MR Extraction</p>
            <p className="text-muted-foreground mt-1">
              1 credit per minute of audio. A 4-minute song = 4 credits.
            </p>
          </div>
          <div>
            <p className="font-medium">LRC Generation</p>
            <p className="text-muted-foreground mt-1">
              1 credit per minute. A 4-minute song = 4 credits.
            </p>
          </div>
          <div>
            <p className="font-medium">LRC + MR Bundle</p>
            <p className="text-muted-foreground mt-1">
              2 credits per minute. A 4-minute song = 8 credits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
