// Locale + routing configuration.
// Single source of truth shared by the middleware, the language provider,
// the nav switcher, the sitemap, and per-page metadata.

export const LOCALES = [
  "en",
  "zh",
  "ja",
  "fr",
  "es",
  "ko",
  "pt",
  "de",
  "ru",
] as const;

export type Lang = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Lang = "en";

export const SITE_URL = "https://soundril.com";

// Base paths that have localized ([locale]) variants. The default locale is
// served at these clean URLs (/, /help); other locales are prefixed
// (/ko, /ko/help). When adding a new localized page under app/[locale],
// register its base path here.
export const LOCALIZED_PATHS = ["/", "/help"] as const;

export function isLocale(value: string | undefined): value is Lang {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function isLocalizedPath(basePath: string): boolean {
  return (LOCALIZED_PATHS as readonly string[]).includes(basePath);
}

// Split a pathname into its locale (if explicitly prefixed) and base path.
//   "/ko/help" -> { locale: "ko", basePath: "/help" }
//   "/help"    -> { locale: "en", basePath: "/help" }
//   "/"        -> { locale: "en", basePath: "/" }
export function stripLocale(pathname: string): { locale: Lang; basePath: string } {
  const segments = pathname.split("/").filter(Boolean);
  if (isLocale(segments[0])) {
    const rest = segments.slice(1).join("/");
    return { locale: segments[0], basePath: rest ? `/${rest}` : "/" };
  }
  return { locale: DEFAULT_LOCALE, basePath: pathname || "/" };
}

// Locale that should drive the UI for a given pathname.
//   /ko, /ja/help        -> that locale (URL is authoritative)
//   /, /help             -> default locale (en)
//   /privacy, /dashboard -> null (fall back to stored/browser preference)
export function routeLocale(pathname: string): Lang | null {
  const segments = pathname.split("/").filter(Boolean);
  if (isLocale(segments[0])) return segments[0];
  const basePath = pathname || "/";
  return isLocalizedPath(basePath) ? DEFAULT_LOCALE : null;
}

// Build an href for a base path in a locale.
//   en           -> clean path (/, /help)
//   other locale -> /{locale}{path} (/ko, /ko/help)
export function localizedHref(locale: Lang, basePath: string): string {
  if (locale === DEFAULT_LOCALE) return basePath;
  return basePath === "/" ? `/${locale}` : `/${locale}${basePath}`;
}

// Absolute URL for canonical / sitemap / hreflang.
export function localizedUrl(locale: Lang, basePath: string): string {
  return SITE_URL + localizedHref(locale, basePath);
}
