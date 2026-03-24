"use client";

import { useEffect, useState } from "react";
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
import { Waveform } from "@/components/waveform";
import Link from "next/link";
import {
  Music,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  History as HistoryIcon,
} from "lucide-react";

interface JobItem {
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

export default function HistoryPage() {
  const { user } = useAuth();
  const { t } = useT();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchJobs = async () => {
      const q = query(
        collection(db, "jobs"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const snap = await getDocs(q);
      setJobs(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as JobItem)
      );
      setLoading(false);
    };

    fetchJobs();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Waveform bars={5} size="md" />
      </div>
    );
  }

  const typeLabel = (type: string) =>
    type === "mr"
      ? t("history.mr")
      : type === "lrc"
        ? t("history.lrc")
        : t("history.lrcPlusMr");

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <HistoryIcon className="h-4.5 w-4.5 text-primary" />
          </div>
          {t("history.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("history.subtitle")}
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border/60 bg-card">
          <Waveform
            bars={5}
            size="md"
            animated={false}
            className="justify-center opacity-30 mb-4"
          />
          <p className="text-muted-foreground">{t("history.noJobsYet")}</p>
          <Link href="/dashboard" className="text-primary text-sm mt-2 inline-block">
            {t("history.startFirstJob")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
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
                    {typeLabel(job.type)}{" "}
                    · {job.creditsCharged} {t("common.min")}
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
      )}
    </div>
  );
}
