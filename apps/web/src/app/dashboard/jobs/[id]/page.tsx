"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { db, auth } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/lib/i18n";
import { isPaidPlan } from "@/lib/plan";
import { Waveform } from "@/components/waveform";
import {
  Music,
  Mic,
  FileText,
  Download,
  Lock,
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
  vocalsStoragePath?: string;
  lrcStoragePath?: string;
  errorMessage?: string;
  processingTimeMs?: number;
  createdAt: { seconds: number };
  completedAt?: { seconds: number };
}

const statusConfig = {
  queued: {
    icon: Clock,
    labelKey: "job.queued",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  processing: {
    icon: Loader2,
    labelKey: "job.processing",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  completed: {
    icon: CheckCircle2,
    labelKey: "job.completed",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  failed: {
    icon: XCircle,
    labelKey: "job.failed",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  canceled: {
    icon: XCircle,
    labelKey: "job.canceled",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, productId } = useAuth();
  const { t, lang } = useT();
  const isPaid = isPaidPlan(productId);
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
        <p className="text-muted-foreground">{t("job.jobNotFound")}</p>
        <Link
          href="/dashboard"
          className="text-primary text-sm mt-2 inline-block"
        >
          {t("job.backToDashboard")}
        </Link>
      </div>
    );
  }

  const status = statusConfig[job.status] || statusConfig.failed;
  const StatusIcon = status.icon;
  const isActive = job.status === "queued" || job.status === "processing";

  const typeLabel =
    job.type === "mr"
      ? t("job.mrExtraction")
      : job.type === "lrc"
        ? t("job.lrcGeneration")
        : t("job.lrcPlusMr");

  const handleDownload = async (path: string, filename: string) => {
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

  const getPreviewUrl = useCallback(async (path: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    const res = await fetch(
      `/api/jobs/${jobId}?download=${encodeURIComponent(path)}`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    if (!res.ok) return null;
    const { url } = await res.json();
    return url as string;
  }, [jobId]);

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/history"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("job.backToHistory")}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{job.inputFileName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {typeLabel} · {job.creditsCharged} {t("common.min")}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}
        >
          <StatusIcon
            className={`h-3.5 w-3.5 ${job.status === "processing" ? "animate-spin" : ""}`}
          />
          {t(status.labelKey)}
        </div>
      </div>

      {/* Progress */}
      {isActive && (
        <div className="rounded-xl border border-border/60 bg-card p-6 mb-6">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">
              {job.progressStep || t("job.waiting")}
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
          <h3 className="font-medium mb-4">{t("job.results")}</h3>

          {!isPaid && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
              <div className="flex items-start gap-2 text-sm text-amber-400">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  {t("job.previewOnly")}{" "}
                  <Link href="/dashboard/pricing" className="underline hover:text-amber-300">
                    {t("job.subscribeToDownload")}
                  </Link>{" "}
                  {t("job.toDownloadFullResults")}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {job.mrStoragePath && (
              isPaid ? (
                <button
                  onClick={() => handleDownload(job.mrStoragePath!, `${job.inputFileName.replace(/\.[^.]+$/, "")}_mr.mp3`)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("job.mrTrack")}</p>
                    <p className="text-xs text-muted-foreground">{t("job.mp3Quality")}</p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : (
                <AudioPreview label={t("job.mrTrack")} icon={<Music className="h-5 w-5 text-primary" />} storagePath={job.mrStoragePath} getUrl={getPreviewUrl} t={t} />
              )
            )}
            {job.vocalsStoragePath && (
              isPaid ? (
                <button
                  onClick={() => handleDownload(job.vocalsStoragePath!, `${job.inputFileName.replace(/\.[^.]+$/, "")}_vocals.mp3`)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mic className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("job.vocalsOnly")}</p>
                    <p className="text-xs text-muted-foreground">{t("job.mp3Quality")}</p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : (
                <AudioPreview label={t("job.vocalsOnly")} icon={<Mic className="h-5 w-5 text-primary" />} storagePath={job.vocalsStoragePath} getUrl={getPreviewUrl} t={t} />
              )
            )}
            {job.lrcStoragePath && (
              isPaid ? (
                <button
                  onClick={() => handleDownload(job.lrcStoragePath!, `${job.inputFileName.replace(/\.[^.]+$/, "")}.lrc`)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("job.lrcFile")}</p>
                    <p className="text-xs text-muted-foreground">{t("job.synchronizedLyrics")}</p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : (
                <LrcPreview storagePath={job.lrcStoragePath} getUrl={getPreviewUrl} t={t} />
              )
            )}
          </div>

          {job.processingTimeMs && (
            <p className="text-xs text-muted-foreground mt-4">
              {t("job.processedIn")}{" "}
              {job.processingTimeMs < 60000
                ? `${(job.processingTimeMs / 1000).toFixed(1)}s`
                : `${Math.floor(job.processingTimeMs / 60000)}m ${Math.round((job.processingTimeMs % 60000) / 1000)}s`}
            </p>
          )}
        </div>
      )}

      {/* Job info */}
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h3 className="font-medium mb-4">{t("job.details")}</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("job.jobId")}</dt>
            <dd className="font-mono text-xs">{jobId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("job.duration")}</dt>
            <dd>
              {Math.floor(job.inputDurationSeconds / 60)}:
              {String(job.inputDurationSeconds % 60).padStart(2, "0")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("job.created")}</dt>
            <dd>
              {job.createdAt
                ? new Date(job.createdAt.seconds * 1000).toLocaleString(lang)
                : "--"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}


// ── 30초 오디오 미리보기 ──
function AudioPreview({
  label,
  icon,
  storagePath,
  getUrl,
  t,
}: {
  label: string;
  icon: React.ReactNode;
  storagePath: string;
  getUrl: (path: string) => Promise<string | null>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const PREVIEW_LIMIT = 30;

  const handlePlay = async () => {
    if (!url) {
      const fetchedUrl = await getUrl(storagePath);
      if (fetchedUrl) setUrl(fetchedUrl);
    }
    setPlaying(true);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.currentTime >= PREVIEW_LIMIT) {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
        toast.info(t("job.previewLimited"));
      }
    };
    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
    };
  }, [url, t]);

  useEffect(() => {
    if (url && playing) {
      audioRef.current?.play();
    }
  }, [url, playing]);

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{t("job.previewDuration")}</p>
        </div>
        <button
          onClick={playing ? () => audioRef.current?.pause() : handlePlay}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          {playing ? t("job.pause") : t("job.playPreview")}
        </button>
      </div>
      {url && <audio ref={audioRef} src={url} preload="auto" />}
    </div>
  );
}


// ── LRC 첫 5줄 미리보기 ──
function LrcPreview({
  storagePath,
  getUrl,
  t,
}: {
  storagePath: string;
  getUrl: (path: string) => Promise<string | null>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    setLoading(true);
    const url = await getUrl(storagePath);
    if (!url) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(url);
      const text = await res.text();
      const allLines = text.split("\n").filter((l) => l.trim());
      setLines(allLines.slice(0, 5));
    } catch {
      toast.error(t("job.failedToLoadPreview"));
    }
    setLoading(false);
  };

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{t("job.lrcFile")}</p>
          <p className="text-xs text-muted-foreground">{t("job.first5Lines")}</p>
        </div>
        {!lines && (
          <button
            onClick={handleLoad}
            disabled={loading}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {loading ? t("job.loading") : t("job.showPreview")}
          </button>
        )}
      </div>
      {lines && (
        <div className="mt-2 rounded-lg bg-muted/50 p-3 font-mono text-xs space-y-1">
          {lines.map((line, i) => (
            <p key={i} className="text-muted-foreground">{line}</p>
          ))}
          <p className="text-amber-400 mt-2">{t("job.subscribeFullLyrics")}</p>
        </div>
      )}
    </div>
  );
}
