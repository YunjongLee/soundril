"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/lib/i18n";
import {
  Music,
  FileText,
  ArrowRight,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";

interface RecentJob {
  id: string;
  type: "mr" | "lrc" | "lrc_mr";
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  inputFileName: string;
  creditsCharged: number;
  coverUrl?: string | null;
  createdAt: { seconds: number };
}

const statusIcons = {
  queued: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  canceled: XCircle,
};

const statusColors = {
  queued: "text-yellow-500",
  processing: "text-blue-500",
  completed: "text-green-500",
  failed: "text-red-500",
  canceled: "text-muted-foreground",
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { t } = useT();
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchRecent = async () => {
      const q = query(
        collection(db, "jobs"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const snap = await getDocs(q);
      setRecentJobs(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecentJob)
      );
    };
    fetchRecent();
  }, [user]);

  const typeLabel = (type: string) =>
    type === "mr"
      ? t("history.mr")
      : type === "lrc"
        ? t("history.lrc")
        : t("history.lrcPlusMr");

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {t("dashboard.welcomeBack")}{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("dashboard.chooseToolToStart")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            {t("dashboard.minutesRemaining")}
          </div>
          <p className="text-2xl font-bold mt-2">{profile?.credits ?? "--"}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            {t("dashboard.minutesUsed")}
          </div>
          <p className="text-2xl font-bold mt-2">{profile?.totalCreditsUsed ?? "--"}</p>
        </div>
      </div>

      {/* Tools */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
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
          <h3 className="font-semibold text-lg mt-4">{t("dashboard.arToMr")}</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {t("dashboard.arToMrDesc")}
          </p>
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
          <h3 className="font-semibold text-lg mt-4">{t("dashboard.arToLrc")}</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {t("dashboard.arToLrcDesc")}
          </p>
        </Link>
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t("dashboard.recentJobs")}</h2>
            <Link
              href="/dashboard/history"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <div className="space-y-2">
            {recentJobs.map((job) => {
              const StatusIcon = statusIcons[job.status];
              return (
                <Link
                  key={job.id}
                  href={`/dashboard/jobs/${job.id}`}
                  className="flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {job.coverUrl ? (
                      <img src={job.coverUrl} alt="" className="h-full w-full object-cover" />
                    ) : job.type === "mr" ? (
                      <Music className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{job.inputFileName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeLabel(job.type)} · {job.creditsCharged} {t("common.min")}
                      {job.createdAt &&
                        ` · ${new Date(job.createdAt.seconds * 1000).toLocaleDateString()}`}
                    </p>
                  </div>
                  <StatusIcon
                    className={`h-4 w-4 shrink-0 ${statusColors[job.status]} ${
                      job.status === "processing" ? "animate-spin" : ""
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{t("dashboard.recentInvoices")}</h2>
          <Link
            href="/dashboard/invoices"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("dashboard.viewAll")}
          </Link>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("dashboard.noInvoicesYet")}</p>
        </div>
      </div>
    </div>
  );
}
