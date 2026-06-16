// Server-safe SEO helpers. Composes per-locale <title>/<description> from
// existing translated strings (no new translations invented) and builds the
// hreflang alternates map. Imported by [locale] page generateMetadata.

import en from "./en";
import ko from "./ko";
import zh from "./zh";
import ja from "./ja";
import fr from "./fr";
import es from "./es";
import pt from "./pt";
import de from "./de";
import ru from "./ru";
import { LOCALES, DEFAULT_LOCALE, localizedHref, type Lang } from "./config";

const dicts: Record<Lang, typeof en> = { en, ko, zh, ja, fr, es, pt, de, ru };

export interface PageMeta {
  title: string;
  description: string;
}

export function pageMeta(locale: Lang, page: "landing" | "help"): PageMeta {
  const d = dicts[locale] ?? en;
  if (page === "help") {
    return { title: d.help.title, description: d.help.subtitle };
  }
  // Landing: brand-forward title built from the translated section heading.
  return {
    title: `Soundril – ${d.landing.features.title}`,
    description: d.landing.hero.subtitle,
  };
}

// hreflang alternates for a localized base path ("/", "/help").
export function languageAlternates(basePath: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = localizedHref(locale, basePath);
  }
  languages["x-default"] = localizedHref(DEFAULT_LOCALE, basePath);
  return languages;
}
