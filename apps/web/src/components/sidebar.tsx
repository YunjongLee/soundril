"use client";

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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/mr", label: "AR → MR", icon: Music },
  { href: "/dashboard/lrc", label: "AR → LRC", icon: FileText },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/pricing", label: "Pricing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut(auth);
    router.push("/");
  };

  return (
    <aside className="w-64 border-r border-border/40 bg-card/50 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-6 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <AudioLines className="h-5 w-5 text-primary" />
          Soundril
        </Link>
      </div>

      {/* Credits */}
      <div className="px-4 py-3 mx-3 mt-4 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Coins className="h-3.5 w-3.5" />
          Credits
        </div>
        <div className="text-lg font-semibold text-primary mt-0.5">{profile?.credits ?? "--"}</div>
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
    </aside>
  );
}
