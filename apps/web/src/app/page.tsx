"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/components/auth-provider";
import { Waveform } from "@/components/waveform";
import { Music, FileText, Zap, Check, AudioLines } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

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
      "Commercial-grade accuracy powered by state-of-the-art AI. Process any song in minutes.",
  },
];

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
    cta: "Get Started",
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
    cta: "Subscribe",
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
    cta: "Subscribe",
    highlighted: false,
  },
];

export default function LandingPage() {
  const { profile } = useAuth();
  const userPlan = profile?.plan ?? null;
  const [yearly, setYearly] = useState(false);

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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-6"
          >
            <div className="flex items-center gap-[2px] h-3">
              <div className="w-0.5 rounded-full bg-primary/60 animate-[wave-xs_1.2s_ease-in-out_infinite]" style={{ animationDelay: "0s" }} />
              <div className="w-0.5 rounded-full bg-primary/60 animate-[wave-xs_1.2s_ease-in-out_infinite]" style={{ animationDelay: "0.15s" }} />
              <div className="w-0.5 rounded-full bg-primary/60 animate-[wave-xs_1.2s_ease-in-out_infinite]" style={{ animationDelay: "0.3s" }} />
            </div>
            AI-Powered Audio Tools
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl"
          >
            Transform Audio
            <br />
            with <span className="text-primary">AI Precision</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl"
          >
            Extract instrumentals, generate synchronized lyrics. Professional
            audio processing powered by state-of-the-art AI models.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex gap-4 mt-10"
          >
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
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-sm text-muted-foreground mt-4"
          >
            10 free minutes on signup. No credit card required.
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              Powerful Audio Tools
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              From vocal removal to lyrics synchronization, everything you need
              in one place.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className="rounded-xl border border-border/60 bg-card p-6 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mt-3">
              Three simple steps to transform your audio.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
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
              <motion.div
                key={item.step}
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mt-4">{item.title}</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold">Choose Your Plan</h2>
            <p className="text-muted-foreground mt-3">
              Try it free. Upgrade for higher limits and advanced features.
            </p>
          </motion.div>

          {/* Monthly / Annually toggle */}
          <div className="flex justify-center mt-8 mb-8">
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

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className={`relative rounded-xl border p-6 flex flex-col hover:-translate-y-1 transition-transform duration-300 ${
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
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-bold">
                    {yearly ? plan.yearly.price : plan.monthly.price}
                  </span>
                  {plan.id !== "free" && (
                    <span className="text-muted-foreground text-sm">/mo</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {yearly ? plan.yearly.sub : plan.monthly.sub}
                </p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {userPlan === plan.id ? (
                  <div className="mt-6 inline-flex items-center justify-center rounded-lg text-sm font-medium h-10 border border-border text-muted-foreground cursor-default">
                    Current Plan
                  </div>
                ) : (
                  <Link
                    href={userPlan ? "/dashboard/pricing" : "/login"}
                    className={`mt-6 inline-flex items-center justify-center rounded-lg text-sm font-medium h-10 transition-colors ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border hover:bg-muted"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10">
        <div className="container">
          <div className="flex flex-col-reverse items-center md:flex-row md:justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Soundril. All rights reserved.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
              <div className="flex gap-6">
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Use
                </Link>
              </div>
              <Link href="/help" className="hover:text-foreground transition-colors">
                help@soundril.com
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
