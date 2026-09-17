"use client";

import { useRef, useState } from "react";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Course lesson video — download deliberately removed per client request
 * (course content stays inside the platform, not saved locally), playback
 * speed added since the native browser controls don't offer one.
 *
 * `controlsList="nodownload"` drops the download button Chrome/Edge render
 * in the native control bar by default; `onContextMenu` blocks the
 * right-click "Save video as..." escape hatch. Neither is a hard technical
 * guarantee against extraction (nothing rendered in a browser ever is —
 * dev tools or a plain network-tab save always remain possible), but it
 * removes every one-click affordance a learner would otherwise see.
 */
export function CourseVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);

  function setSpeed(speed: number) {
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setRate(speed);
    setMenuOpen(false);
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        className="w-full rounded-md bg-black"
      />
      <div className="absolute right-2 top-2">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/80"
        >
          <Gauge className="size-3.5" />
          {rate}×
        </button>
        {menuOpen && (
          <div className="motion-menu absolute right-0 top-full mt-1 min-w-20 rounded-md border border-border bg-surface p-1 shadow-(--shadow-token-md)">
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setSpeed(speed)}
                className={cn(
                  "block w-full rounded px-2.5 py-1.5 text-left text-xs",
                  speed === rate
                    ? "bg-accent-soft font-semibold text-accent-soft-fg"
                    : "text-text-secondary hover:bg-surface-alt",
                )}
              >
                {speed}×
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
