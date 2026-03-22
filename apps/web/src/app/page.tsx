"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/lib/i18n";
import { Waveform } from "@/components/waveform";
import { Music, FileText, Zap, Check } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const { user, profile } = useAuth();
  const { t } = useT();
  const userPlan = profile?.plan ?? null;
  const [yearly, setYearly] = useState(false);

  const features = [
    {
      id: "mr",
      icon: Music,
      title: t("landing.features.mrTitle"),
      description: t("landing.features.mrDesc"),
    },
    {
      id: "lrc",
      icon: FileText,
      title: t("landing.features.lrcTitle"),
      description: t("landing.features.lrcDesc"),
    },
    {
      id: "fast",
      icon: Zap,
      title: t("landing.features.fastTitle"),
      description: t("landing.features.fastDesc"),
    },
  ];

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
      cta: t("pricing.getStarted"),
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
      cta: t("pricing.subscribe"),
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
      cta: t("pricing.subscribe"),
      highlighted: false,
    },
  ];

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
            {t("landing.hero.badge")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl"
          >
            {t("landing.hero.title1")}
            <br />
            {t("landing.hero.title2")}<span className="text-primary">{t("landing.hero.titleHighlight")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl"
          >
            {t("landing.hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex gap-4 mt-10"
          >
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 transition-colors"
            >
              {user ? t("nav.dashboard") : t("landing.hero.getStarted")}
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-border hover:bg-muted h-11 px-8 transition-colors"
            >
              {t("landing.hero.learnMore")}
            </Link>
          </motion.div>

          {!user && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-sm text-muted-foreground mt-4"
            >
              {t("landing.hero.freeMinutes")}
            </motion.p>
          )}
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
              {t("landing.features.title")}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              {t("landing.features.subtitle")}
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
                key={feature.id}
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
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing.howItWorks.title")}</h2>
            <p className="text-muted-foreground mt-3">
              {t("landing.howItWorks.subtitle")}
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
                title: t("landing.howItWorks.uploadTitle"),
                desc: t("landing.howItWorks.uploadDesc"),
              },
              {
                step: "2",
                title: t("landing.howItWorks.processTitle"),
                desc: t("landing.howItWorks.processDesc"),
              },
              {
                step: "3",
                title: t("landing.howItWorks.downloadTitle"),
                desc: t("landing.howItWorks.downloadDesc"),
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
            <h2 className="text-3xl md:text-4xl font-bold">{t("pricing.chooseYourPlan")}</h2>
            <p className="text-muted-foreground mt-3">
              {t("pricing.tryFreeSubtitle")}
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

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
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
                    {t("pricing.mostPopular")}
                  </div>
                )}
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-bold">
                    {yearly ? plan.yearly.price : plan.monthly.price}
                  </span>
                  {plan.id !== "free" && (
                    <span className="text-muted-foreground text-sm">{t("pricing.perMonth")}</span>
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
                    {t("pricing.currentPlan")}
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

      {/* Final CTA */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            {t("landing.cta.title")}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            {t("landing.cta.subtitle")}
          </p>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 transition-colors mt-8"
          >
            {user ? t("nav.dashboard") : t("landing.hero.getStarted")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10">
        <div className="container">
          <div className="flex flex-col-reverse items-center md:flex-row md:justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {t("landing.footer.copyright")}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
              <div className="flex gap-6">
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  {t("landing.footer.privacyPolicy")}
                </Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  {t("landing.footer.termsOfUse")}
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
