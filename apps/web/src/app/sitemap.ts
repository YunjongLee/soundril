import type { MetadataRoute } from "next";
import { LOCALES, DEFAULT_LOCALE, SITE_URL, localizedUrl } from "@/lib/i18n/config";

// Localized pages: one <url> per locale, each listing all hreflang alternates.
const LOCALIZED: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/help", priority: 0.6, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority, changeFrequency } of LOCALIZED) {
    const languages: Record<string, string> = { "x-default": localizedUrl(DEFAULT_LOCALE, path) };
    for (const locale of LOCALES) {
      languages[locale] = localizedUrl(locale, path);
    }
    for (const locale of LOCALES) {
      entries.push({
        url: localizedUrl(locale, path),
        changeFrequency,
        priority,
        alternates: { languages },
      });
    }
  }

  // English-only pages.
  entries.push(
    { url: `${SITE_URL}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "monthly", priority: 0.3 },
  );

  return entries;
}
