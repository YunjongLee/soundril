import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizedHref } from "@/lib/i18n/config";
import { pageMeta, languageAlternates } from "@/lib/i18n/seo";
import HelpContent from "./help-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { title, description } = pageMeta(locale, "help");
  const path = localizedHref(locale, "/help");
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: languageAlternates("/help"),
    },
    openGraph: { title, description, url: path, type: "website" },
  };
}

export default async function LocaleHelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <HelpContent />;
}
