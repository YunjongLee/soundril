"use client";

import { useEffect, useState, useRef, useCallback, type RefObject } from "react";
import type WaveSurfer from "wavesurfer.js";
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
  Play,
  Pause,
  Eye,
  EyeOff,
  Copy,
  Check,
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
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const jobId = params.id as string;

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
                <AudioPreview trackId="mr" label={t("job.mrTrack")} icon={<Music className="h-5 w-5 text-primary" />} storagePath={job.mrStoragePath} getUrl={getPreviewUrl} t={t} playingTrack={playingTrack} onPlay={setPlayingTrack} />
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
                <AudioPreview trackId="vocals" label={t("job.vocalsOnly")} icon={<Mic className="h-5 w-5 text-primary" />} storagePath={job.vocalsStoragePath} getUrl={getPreviewUrl} t={t} playingTrack={playingTrack} onPlay={setPlayingTrack} />
              )
            )}
            {job.lrcStoragePath && (
              isPaid ? (
                <LrcResult
                  jobId={jobId}
                  storagePath={job.lrcStoragePath}
                  filename={`${job.inputFileName.replace(/\.[^.]+$/, "")}.lrc`}
                  onDownload={handleDownload}
                  t={t}
                />
              ) : (
                <LrcPreview storagePath={job.lrcStoragePath} t={t} />
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


// ── AudioBuffer → WAV Blob 변환 ──
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numCh * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, length - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length - 44, true);

  const channels = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(buffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([out], { type: "audio/wav" });
}

// ── 오디오 Waveform 미리보기 (1분 제한) ──
function AudioPreview({
  trackId,
  label,
  icon,
  storagePath,
  getUrl,
  t,
  playingTrack,
  onPlay,
}: {
  trackId: string;
  label: string;
  icon: React.ReactNode;
  storagePath: string;
  getUrl: (path: string) => Promise<string | null>;
  t: (key: string, params?: Record<string, string | number>) => string;
  playingTrack: string | null;
  onPlay: (id: string | null) => void;
}) {
  const waveRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const PREVIEW_LIMIT = 60;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // 자동 로드
  useEffect(() => {
    let ws: WaveSurfer | null = null;
    let cancelled = false;

    (async () => {
      const url = await getUrl(storagePath);
      if (!url || !waveRef.current || cancelled) {
        setLoading(false);
        return;
      }

      const WS = (await import("wavesurfer.js")).default;
      if (cancelled) return;

      // 오디오 fetch → 첫 1분만 잘라서 blob 생성
      const response = await fetch(url);
      if (cancelled) return;
      const arrayBuffer = await response.arrayBuffer();
      if (cancelled) return;

      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      const limitSamples = Math.min(decoded.length, PREVIEW_LIMIT * decoded.sampleRate);
      const trimmed = audioCtx.createBuffer(decoded.numberOfChannels, limitSamples, decoded.sampleRate);
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        trimmed.copyToChannel(decoded.getChannelData(ch).slice(0, limitSamples), ch);
      }
      await audioCtx.close();
      if (cancelled) return;

      // trimmed buffer → wav blob
      const wavBlob = audioBufferToWav(trimmed);
      const trimmedUrl = URL.createObjectURL(wavBlob);

      ws = WS.create({
        container: waveRef.current,
        waveColor: "rgba(130, 73, 223, 0.3)",
        progressColor: "#8249DF",
        cursorColor: "#8249DF",
        cursorWidth: 1,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 48,
        normalize: true,
        dragToSeek: true,
        url: trimmedUrl,
      });

      ws.on("ready", () => {
        setDuration(ws!.getDuration());
        setLoaded(true);
        setLoading(false);
      });

      ws.on("timeupdate", (time) => setCurrentTime(time));
      ws.on("play", () => {
        setPlaying(true);
        onPlay(trackId);
      });
      ws.on("pause", () => {
        setPlaying(false);
        onPlay(null);
      });
      ws.on("finish", () => {
        setPlaying(false);
        setCurrentTime(0);
        onPlay(null);
      });

      wsRef.current = ws;
    })();

    return () => {
      cancelled = true;
      ws?.destroy();
    };
  }, [storagePath, getUrl, t]);

  // 다른 트랙 재생 시 자신 pause
  useEffect(() => {
    if (playingTrack && playingTrack !== trackId && wsRef.current?.isPlaying()) {
      wsRef.current.pause();
    }
  }, [playingTrack, trackId]);

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {loaded ? `${formatTime(currentTime)} / ${formatTime(duration)}` : t("job.previewDuration")}
          </p>
        </div>
        <button
          onClick={() => wsRef.current?.playPause()}
          disabled={!loaded}
          className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>
      <div ref={waveRef} className={loaded ? "" : "hidden"} />
      {loading && (
        <div className="h-12 rounded-lg bg-muted/30 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}


// ── LRC 결과: 미리보기 + 복사 + 다운로드 ──
function LrcResult({
  jobId,
  storagePath,
  filename,
  onDownload,
  t,
}: {
  jobId: string;
  storagePath: string;
  filename: string;
  onDownload: (path: string, filename: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchContent = async () => {
    if (content) return content;
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(
        `/api/jobs/${jobId}?download=${encodeURIComponent(storagePath)}&preview=true`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      if (!res.ok) throw new Error();
      const text = await res.text();
      setContent(text);
      return text;
    } catch {
      toast.error(t("job.failedToLoadPreview"));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePreview = async () => {
    if (!showPreview) await fetchContent();
    setShowPreview((v) => !v);
  };

  const handleCopy = async () => {
    const text = await fetchContent();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{t("job.lrcFile")}</p>
          <p className="text-xs text-muted-foreground">{t("job.synchronizedLyrics")}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleTogglePreview}
            disabled={loading}
            className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
            title={showPreview ? t("job.hideLrc") : t("job.showLrc")}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            onClick={handleCopy}
            className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0"
            title={t("job.copyLrc")}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onDownload(storagePath, filename)}
            className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0"
            title={filename}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      {showPreview && content && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 max-h-80 overflow-y-auto font-mono text-xs space-y-1">
          {content.split("\n").filter((l) => l.trim()).map((line, i) => (
            <p key={i} className="text-muted-foreground">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LRC 첫 5줄 미리보기 ──
function LrcPreview({
  storagePath,
  t,
}: {
  storagePath: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(
        `/api/jobs/${storagePath.split("/")[2]}?download=${encodeURIComponent(storagePath)}&preview=true`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      if (!res.ok) throw new Error();
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
            className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
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
