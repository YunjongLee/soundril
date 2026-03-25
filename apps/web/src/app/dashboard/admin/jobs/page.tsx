"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Ban,
} from "lucide-react";
import { Waveform } from "@/components/waveform";
import { adminFetch } from "@/lib/admin-fetch";

interface Job {
  id: string;
  userId: string;
  userEmail: string | null;
  type: "mr" | "lrc" | "lrc_mr";
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  progress: number;
  progressStep: string;
  inputFileName: string;
  inputDurationSeconds: number;
  creditsCharged: number;
  errorMessage: string | null;
  processingTimeMs: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const statusFilters = [
  "all",
  "queued",
  "processing",
  "completed",
  "failed",
  "canceled",
] as const;

const statusIcons: Record<string, typeof Clock> = {
  queued: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  canceled: Ban,
};

const statusColors: Record<string, string> = {
  queued: "text-yellow-500",
  processing: "text-blue-500",
  completed: "text-green-500",
  failed: "text-red-500",
  canceled: "text-muted-foreground",
};

function isStuck(job: Job): boolean {
  if (job.status !== "processing" || !job.updatedAt) return false;
  const elapsed = Date.now() - new Date(job.updatedAt).getTime();
  return elapsed > 30 * 60 * 1000; // 30 minutes
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchJobs = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      params.set("limit", "50");
      if (cursor) params.set("startAfter", cursor);

      const res = await adminFetch(`/api/admin/jobs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json() as Promise<{ jobs: Job[]; hasMore: boolean }>;
    },
    [filter]
  );

  useEffect(() => {
    setLoading(true);
    fetchJobs().then((data) => {
      setJobs(data.jobs);
      setHasMore(data.hasMore);
      setLoading(false);
    });
  }, [fetchJobs]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const lastId = jobs[jobs.length - 1]?.id;
    const data = await fetchJobs(lastId);
    setJobs((prev) => [...prev, ...data.jobs]);
    setHasMore(data.hasMore);
    setLoadingMore(false);
  };

  const handleCancel = async (jobId: string) => {
    if (!window.confirm("Cancel this job? Credits will be refunded.")) return;
    setActionLoading(jobId);
    try {
      const res = await adminFetch(`/api/admin/jobs/${jobId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to cancel");
        return;
      }
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: "canceled", errorMessage: "Canceled by admin" }
            : j
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (jobId: string) => {
    if (!window.confirm("Retry this job? No additional credits will be charged."))
      return;
    setActionLoading(jobId);
    try {
      const res = await adminFetch(`/api/admin/jobs/${jobId}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to retry");
        return;
      }
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: "queued", progress: 0, errorMessage: null }
            : j
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Waveform bars={5} size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-primary" />
          </div>
          Job Monitor
        </h1>
        <p className="text-muted-foreground mt-2">
          View and manage all processing jobs
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border/60 bg-card">
          <p className="text-muted-foreground">No jobs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const StatusIcon = statusIcons[job.status] || Clock;
            const stuck = isStuck(job);
            return (
              <div
                key={job.id}
                className={`rounded-lg border bg-card p-4 ${
                  stuck
                    ? "border-orange-500/50"
                    : "border-border/60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <StatusIcon
                    className={`h-4 w-4 mt-1 shrink-0 ${statusColors[job.status]} ${
                      job.status === "processing" ? "animate-spin" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {job.inputFileName}
                      </p>
                      {stuck && (
                        <span className="flex items-center gap-1 text-xs text-orange-500 font-medium shrink-0">
                          <AlertTriangle className="h-3 w-3" />
                          Stuck
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {job.userEmail || job.userId} ·{" "}
                      {job.type.toUpperCase()} ·{" "}
                      {job.creditsCharged} credits
                      {job.processingTimeMs
                        ? ` · ${formatDuration(job.processingTimeMs)}`
                        : ""}
                      {job.createdAt
                        ? ` · ${new Date(job.createdAt).toLocaleString()}`
                        : ""}
                    </p>
                    {job.status === "processing" && (
                      <p className="text-xs text-blue-500 mt-1">
                        {job.progress}%{job.progressStep ? ` — ${job.progressStep}` : ""}
                      </p>
                    )}
                    {job.errorMessage && (
                      <p className="text-xs text-red-500 mt-1 truncate">
                        {job.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(job.status === "queued" ||
                      job.status === "processing") && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        disabled={actionLoading === job.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Cancel"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                    {job.status === "failed" && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={actionLoading === job.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                        title="Retry"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full mt-4 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
