"use client";

import { cn } from "@/lib/utils";

interface WaveformProps {
  bars?: number;
  className?: string;
  barClassName?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export function Waveform({
  bars = 5,
  className,
  barClassName,
  size = "md",
  animated = true,
}: WaveformProps) {
  const heights: Record<string, string[]> = {
    sm: ["h-2", "h-4", "h-6", "h-4", "h-3", "h-5", "h-3", "h-4", "h-2"],
    md: ["h-3", "h-6", "h-10", "h-6", "h-4", "h-8", "h-5", "h-7", "h-3"],
    lg: ["h-4", "h-8", "h-14", "h-10", "h-6", "h-12", "h-8", "h-10", "h-4"],
  };

  const sizeHeights = heights[size];
  const animClass = size === "lg" ? "animate-wave-lg" : "animate-wave";

  return (
    <div className={cn("flex items-center gap-[3px]", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full bg-primary/60",
            sizeHeights[i % sizeHeights.length],
            animated && animClass,
            barClassName
          )}
          style={
            animated ? { animationDelay: `${i * 0.15}s` } : undefined
          }
        />
      ))}
    </div>
  );
}
