"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth-provider";
import { Waveform } from "@/components/waveform";
import {
  Music,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface Job {
  userId: string;
  type: "mr" | "lrc" | "lrc_mr";
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  progress: number;
  progressStep: string;
  inputFileName: string;
  inputDurationSeconds: number;
  creditsCharged: number;
  mrStoragePath?: string;
  lrcStoragePath?: string;
  errorMessage?: string;
  processingTimeMs?: number;
  createdAt: { seconds: number };
  completedAt?: { seconds: number };
}

const statusConfig = {
  queued: {
    icon: Clock,
    label: "Queued",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  canceled: {
    icon: XCircle,
    label: "Canceled",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const jobId = params.id as string;

  useEffect(() => {
    if (!jobId) return;

    const unsub = onSnapshot(
      doc(db, "jobs", jobId),
      (snap) => {
        if (snap.exists()) {
          setJob(snap.data() as Job);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Waveform bars={5} size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Job not found.</p>
        <Link
          href="/dashboard"
          className="text-primary text-sm mt-2 inline-block"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const status = statusConfig[job.status];
  const StatusIcon = status.icon;
  const isActive = job.status === "queued" || job.status === "processing";

  const handleDownload = async (path: string, filename: string) => {
    // Download via signed URL from API
    const idToken = await user?.getIdToken();
    const res = await fetch(
      `/api/jobs/${jobId}?download=${encodeURIComponent(path)}&filename=${encodeURIComponent(filename)}`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    if (!res.ok) return;
    const { url } = await res.json();
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/history"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to History
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{job.inputFileName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {job.type === "mr"
              ? "MR Extraction"
              : job.type === "lrc"
                ? "LRC Generation"
                : "LRC + MR"}{" "}
            · {job.creditsCharged} credits
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}
        >
          <StatusIcon
            className={`h-3.5 w-3.5 ${job.status === "processing" ? "animate-spin" : ""}`}
          />
          {status.label}
        </div>
      </div>

      {/* Progress */}
      {isActive && (
        <div className="rounded-xl border border-border/60 bg-card p-6 mb-6">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">
              {job.progressStep || "Waiting..."}
            </span>
            <span className="font-medium">{job.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <div className="mt-4 flex justify-center">
            <Waveform bars={7} size="sm" />
          </div>
        </div>
      )}

      {/* Error */}
      {job.status === "failed" && job.errorMessage && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-6">
          <p className="text-sm text-red-400">{job.errorMessage}</p>
        </div>
      )}

      {/* Results */}
      {job.status === "completed" && (
        <div className="rounded-xl border border-border/60 bg-card p-6 mb-6">
          <h3 className="font-medium mb-4">Results</h3>
          <div className="space-y-3">
            {job.mrStoragePath && (
              <button
                onClick={() =>
                  handleDownload(
                    job.mrStoragePath!,
                    `${job.inputFileName.replace(/\.[^.]+$/, "")}_mr.mp3`
                  )
                }
                className="w-full flex items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">MR Track</p>
                  <p className="text-xs text-muted-foreground">MP3 320kbps</p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {job.lrcStoragePath && (
              <button
                onClick={() =>
                  handleDownload(
                    job.lrcStoragePath!,
                    `${job.inputFileName.replace(/\.[^.]+$/, "")}.lrc`
                  )
                }
                className="w-full flex items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">LRC File</p>
                  <p className="text-xs text-muted-foreground">
                    Synchronized lyrics
                  </p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {job.processingTimeMs && (
            <p className="text-xs text-muted-foreground mt-4">
              Processed in{" "}
              {job.processingTimeMs < 60000
                ? `${(job.processingTimeMs / 1000).toFixed(1)}s`
                : `${Math.floor(job.processingTimeMs / 60000)}m ${Math.round((job.processingTimeMs % 60000) / 1000)}s`}
            </p>
          )}
        </div>
      )}

      {/* Job info */}
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h3 className="font-medium mb-4">Details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Job ID</dt>
            <dd className="font-mono text-xs">{jobId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Duration</dt>
            <dd>
              {Math.floor(job.inputDurationSeconds / 60)}:
              {String(job.inputDurationSeconds % 60).padStart(2, "0")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Created</dt>
            <dd>
              {job.createdAt
                ? new Date(job.createdAt.seconds * 1000).toLocaleString()
                : "--"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
