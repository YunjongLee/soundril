"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";
import { AudioLines } from "lucide-react";

export function Nav() {
  const { user, loading } = useAuth();

  return (
    <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm fixed top-0 w-full z-50">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <AudioLines className="h-5 w-5 text-primary" />
          Soundril
        </Link>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
