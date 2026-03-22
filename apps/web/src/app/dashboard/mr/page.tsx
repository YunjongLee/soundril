"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/lib/i18n";
import { auth } from "@/lib/firebase/client";
import { Waveform } from "@/components/waveform";
import { Upload, Music, X, AlertCircle, Coins } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/flac",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
];
const MAX_DURATION = 600; // 10분

function getMaxFileSize(plan: string) {
  return plan === "basic" || plan === "pro" ? 200 * 1024 * 1024 : 50 * 1024 * 1024;
}

export default function MRPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { t } = useT();
  const maxFileSize = getMaxFileSize(profile?.plan ?? "free");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const credits = duration ? Math.ceil(duration / 60) : 0;
  const userCredits = profile?.credits ?? 0;
  const insufficientCredits = credits > 0 && userCredits < credits;

  const handleFile = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) {
      toast.error(t("common.unsupportedFormat"));
      return;
    }
    if (f.size > maxFileSize) {
      toast.error(t("common.fileTooLarge", { maxSize: maxFileSize / 1024 / 1024 }));
      return;
    }

    setFile(f);
    const audio = new Audio();
    audio.addEventListener("loadedmetadata", () => {
      const dur = Math.ceil(audio.duration);
      if (dur > MAX_DURATION) {
        toast.error(t("common.audioTooLong", { maxDuration: MAX_DURATION / 60 }));
        setFile(null);
        setDuration(null);
      } else {
        setDuration(dur);
      }
      URL.revokeObjectURL(audio.src);
    });
    audio.addEventListener("error", () => {
      toast.error(t("common.cannotReadAudio"));
      setFile(null);
      URL.revokeObjectURL(audio.src);
    });
    audio.src = URL.createObjectURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !user || !duration) return;
    if (insufficientCredits) {
      toast.error(t("common.notEnoughMinutes"));
      return;
    }
    setSubmitting(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error(t("common.pleaseSignInAgain"));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "mr");
      formData.append("durationSeconds", String(duration));

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 402) {
          throw new Error(t("common.notEnoughMinutesUpgrade"));
        }
        throw new Error(data.error || t("common.failedToCreateJob"));
      }

      const { jobId } = await res.json();
      router.push(`/dashboard/jobs/${jobId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.somethingWentWrong"));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Music className="h-4.5 w-4.5 text-primary" />
          </div>
          {t("mr.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("mr.subtitle")}
        </p>
      </div>

      {/* File Upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : file
              ? "border-primary/40 bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {file ? (
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {(file.size / 1024 / 1024).toFixed(1)} MB
                {duration && ` · ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setDuration(null);
              }}
              className="p-1 rounded hover:bg-muted"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="mt-3 font-medium">{t("common.dropAudioFile")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("common.orClickToBrowse", { maxSize: maxFileSize / 1024 / 1024 })}
            </p>
          </>
        )}
      </div>

      {/* Cost summary */}
      {file && duration && (
        <div className={`mt-4 rounded-lg border p-4 ${
          insufficientCredits
            ? "border-red-500/30 bg-red-500/5"
            : "border-border/60 bg-card"
        }`}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("common.minutesRequired")}</span>
            <span className="font-medium">
              {credits} {t("common.min")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1.5">
            <span className="text-muted-foreground">{t("common.yourBalance")}</span>
            <span className={`font-medium flex items-center gap-1 ${
              insufficientCredits ? "text-red-400" : "text-primary"
            }`}>
              <Coins className="h-3.5 w-3.5" />
              {userCredits} {t("common.min")}
            </span>
          </div>
          {insufficientCredits && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                {t("common.notEnoughMinutes")}{" "}
                <Link href="/dashboard/pricing" className="underline hover:text-red-300">
                  {t("common.upgradeYourPlan")}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || !duration || submitting || insufficientCredits}
        className="mt-6 w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-11 transition-colors"
      >
        {submitting ? (
          <Waveform bars={5} size="sm" barClassName="bg-primary-foreground/60" />
        ) : (
          t("mr.extractMr")
        )}
      </button>
    </div>
  );
}
