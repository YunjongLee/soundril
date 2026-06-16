import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, isLocalizedPath } from "@/lib/i18n/config";

const PROTECTED_PATHS = ["/dashboard"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Auth-gated app routes — redirect unauthenticated users to login.
  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    const session = request.cookies.get("__session")?.value;
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  // 2. Explicit locale prefix (/en, /ko, /ja/help, ...).
  if (isLocale(first)) {
    // The default locale is canonical at clean URLs — strip an explicit /en.
    if (first === DEFAULT_LOCALE) {
      const rest = segments.slice(1).join("/");
      const url = request.nextUrl.clone();
      url.pathname = rest ? `/${rest}` : "/";
      return NextResponse.redirect(url);
    }
    // Other locales pass through to app/[locale].
    return NextResponse.next();
  }

  // 3. Clean default-locale URL for a localized page (/, /help) — rewrite to
  //    /en/... internally so app/[locale] serves it while the URL stays clean.
  if (isLocalizedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // 4. Everything else (/privacy, /terms, /login, ...) — static English route.
  return NextResponse.next();
}

export const config = {
  // Run on all paths except API routes, Next internals, and files with an
  // extension (assets). sitemap.xml / robots.txt / opengraph-image are excluded
  // so their metadata routes are served directly.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|sitemap.xml|robots.txt|.*\\.[\\w]+$).*)",
  ],
};
