"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Waveform } from "@/components/waveform";
import { Music, FileText, ArrowRight, Clock, Coins } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Choose a tool to get started.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            Credits Remaining
          </div>
          <p className="text-2xl font-bold mt-2">--</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Jobs Today
          </div>
          <p className="text-2xl font-bold mt-2">--</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            Credits Used
          </div>
          <p className="text-2xl font-bold mt-2">--</p>
        </div>
      </div>

      {/* Tools */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/mr"
          className="group rounded-xl border border-border/60 bg-card p-6 hover:border-primary/30 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="font-semibold text-lg mt-4">AR → MR</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Remove vocals and extract the instrumental track from any song.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <Waveform bars={7} size="sm" className="opacity-50" />
          </div>
        </Link>

        <Link
          href="/dashboard/lrc"
          className="group rounded-xl border border-border/60 bg-card p-6 hover:border-primary/30 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="font-semibold text-lg mt-4">AR → LRC</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Generate word-level synchronized lyrics from audio and text.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <Waveform bars={7} size="sm" className="opacity-50" />
          </div>
        </Link>
      </div>
    </div>
  );
}
