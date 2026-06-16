import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizedHref } from "@/lib/i18n/config";
import { pageMeta, languageAlternates } from "@/lib/i18n/seo";
import { SoftwareAppJsonLd } from "@/components/seo/json-ld";
import LandingContent from "./landing-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { title, description } = pageMeta(locale, "landing");
  const path = localizedHref(locale, "/");
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
      languages: languageAlternates("/"),
    },
    openGraph: { title, description, url: path, type: "website" },
  };
}

export default async function LocaleLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { description } = pageMeta(locale, "landing");
  return (
    <>
      <SoftwareAppJsonLd description={description} />
      <LandingContent />
    </>
  );
}
