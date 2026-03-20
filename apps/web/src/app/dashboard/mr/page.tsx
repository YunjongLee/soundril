"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/lib/firebase/client";
import { Waveform } from "@/components/waveform";
import { Upload, Music, X } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/flac",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function MRPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) {
      toast.error("Unsupported file format. Use MP3, WAV, FLAC, OGG, or M4A.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum 50MB.");
      return;
    }

    setFile(f);

    // Get audio duration
    const audio = new Audio();
    audio.addEventListener("loadedmetadata", () => {
      setDuration(Math.ceil(audio.duration));
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
    setSubmitting(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Not authenticated");

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
        const error = await res.json();
        throw new Error(error.error || "Failed to create job");
      }

      const { jobId } = await res.json();
      router.push(`/dashboard/jobs/${jobId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const credits = duration ? Math.ceil(duration / 60) : 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Music className="h-4.5 w-4.5 text-primary" />
          </div>
          AR → MR
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload an audio file to extract the instrumental (MR) track.
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
            <p className="mt-3 font-medium">Drop your audio file here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse. MP3, WAV, FLAC, OGG, M4A (max 50MB)
            </p>
          </>
        )}
      </div>

      {/* Cost summary */}
      {file && duration && (
        <div className="mt-4 rounded-lg border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Credits required</span>
            <span className="font-medium">
              {credits} credit{credits !== 1 && "s"}
            </span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || !duration || submitting}
        className="mt-6 w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-11 transition-colors"
      >
        {submitting ? (
          <Waveform bars={5} size="sm" barClassName="bg-primary-foreground/60" />
        ) : (
          "Extract MR"
        )}
      </button>
    </div>
  );
}
