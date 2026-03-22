"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";
import { useT, languages, type Lang } from "@/lib/i18n";
import { AudioLines, Globe } from "lucide-react";

export function Nav() {
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useT();

  return (
    <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm fixed top-0 w-full z-50">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <AudioLines className="h-5 w-5 text-primary" />
          Soundril
        </Link>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Globe className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="appearance-none bg-transparent text-sm text-muted-foreground hover:text-foreground h-9 pl-7 pr-2 rounded-md cursor-pointer transition-colors focus:outline-none"
            >
              {Object.entries(languages).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
            >
              {t("nav.dashboard")}
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
