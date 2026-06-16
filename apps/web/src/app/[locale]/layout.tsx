import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "@/lib/i18n/config";

// Statically generate every locale; reject unknown ones (404).
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return children;
}
