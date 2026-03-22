"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import {
  AudioLines,
  LayoutDashboard,
  Music,
  FileText,
  History,
  CreditCard,
  LogOut,
  Coins,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/mr", label: "AR → MR", icon: Music },
  { href: "/dashboard/lrc", label: "AR → LRC", icon: FileText },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/pricing", label: "Pricing", icon: CreditCard },
];

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut(auth);
    router.push("/");
  };

  return (
    <>
      {/* Minutes */}
      <div className="px-4 py-3 mx-3 mt-4 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Coins className="h-3.5 w-3.5" />
          Minutes
        </div>
        <div className="text-lg font-semibold text-primary mt-0.5">
          {profile?.credits ?? "--"}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-border/40">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                {user.displayName?.[0] || user.email?.[0] || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.displayName || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <>
      {/* 모바일 헤더 */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/40 bg-background/80 backdrop-blur-sm flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg hover:bg-muted"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <AudioLines className="h-5 w-5 text-primary" />
            Soundril
          </Link>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <Coins className="h-3.5 w-3.5" />
          {profile?.credits ?? "--"}
        </div>
      </header>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 모바일 드로어 */}
      <aside
        className={cn(
          "lg:hidden fixed top-14 left-0 z-50 w-64 h-[calc(100vh-3.5rem)] border-r border-border/40 bg-card flex flex-col transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* 데스크톱 사이드바 */}
      <aside className="hidden lg:flex w-64 border-r border-border/40 bg-card/50 flex-col h-screen fixed left-0 top-0">
        <div className="h-14 flex items-center px-6 border-b border-border/40">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg"
          >
            <AudioLines className="h-5 w-5 text-primary" />
            Soundril
          </Link>
        </div>
        <SidebarContent />
      </aside>
    </>
  );
}
