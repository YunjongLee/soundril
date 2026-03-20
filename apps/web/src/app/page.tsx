"use client";

import Link from "next/link";
import { Nav } from "@/components/nav";
import { Waveform } from "@/components/waveform";
import { Music, FileText, Zap, Check } from "lucide-react";

const features = [
  {
    icon: Music,
    title: "AR → MR",
    description:
      "Remove vocals from any song using AI-powered source separation. Get studio-quality instrumental tracks instantly.",
  },
  {
    icon: FileText,
    title: "AR → LRC",
    description:
      "Generate word-level synchronized lyrics files. Perfect for karaoke, subtitles, and music apps.",
  },
  {
    icon: Zap,
    title: "Fast & Accurate",
    description:
      "Powered by Demucs and WhisperX with GPU acceleration. Commercial-grade accuracy in minutes.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    credits: "10 credits",
    description: "Try it out",
    features: ["10 credits on signup", "MR extraction", "LRC generation"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Basic",
    price: "$9",
    period: "/mo",
    credits: "60 credits",
    description: "For casual users",
    features: [
      "60 credits/month",
      "MR extraction",
      "LRC generation",
      "Priority processing",
    ],
    cta: "Subscribe",
    highlighted: false,
  },
  {
    name: "Standard",
    price: "$19",
    period: "/mo",
    credits: "200 credits",
    description: "Most popular",
    features: [
      "200 credits/month",
      "MR extraction",
      "LRC generation",
      "Priority processing",
    ],
    cta: "Subscribe",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$39",
    period: "/mo",
    credits: "500 credits",
    description: "For power users",
    features: [
      "500 credits/month",
      "MR extraction",
      "LRC generation",
      "Priority processing",
      "Bulk processing",
    ],
    cta: "Subscribe",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="relative pt-14 overflow-hidden">
        {/* Background waveform decoration */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <Waveform bars={40} size="lg" className="gap-2" animated={false} />
        </div>

        <div className="container relative flex flex-col items-center text-center py-24 md:py-32 lg:py-40">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-6">
            <Waveform bars={3} size="sm" className="gap-[2px]" />
            AI-Powered Audio Tools
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl">
            Transform Audio with{" "}
            <span className="text-primary">AI Precision</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl">
            Extract instrumentals, generate synchronized lyrics. Professional
            audio processing powered by state-of-the-art AI models.
          </p>

          <div className="flex gap-4 mt-10">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-border hover:bg-muted h-11 px-8 transition-colors"
            >
              Learn More
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            10 free credits on signup. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Powerful Audio Tools
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              From vocal removal to lyrics synchronization, everything you need
              in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border/60 bg-card p-6 hover:border-primary/30 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mt-3">
              Three simple steps to transform your audio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Upload",
                desc: "Upload your audio file (MP3, WAV, FLAC)",
              },
              {
                step: "2",
                title: "Process",
                desc: "AI separates vocals and generates timestamps",
              },
              {
                step: "3",
                title: "Download",
                desc: "Get your MR track or LRC file instantly",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mt-4">{item.title}</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Simple Pricing
            </h2>
            <p className="text-muted-foreground mt-3">
              1 credit = 1 minute of audio processing.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/60 bg-card"
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-medium text-primary mb-3">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.credits}
                </p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`mt-6 inline-flex items-center justify-center rounded-lg text-sm font-medium h-10 transition-colors ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Waveform bars={3} size="sm" className="gap-[2px] opacity-50" />
            Soundril
          </div>
          <p>&copy; {new Date().getFullYear()} Soundril. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
