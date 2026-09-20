"use client";

import { useEffect, useRef, useState } from "react";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import * as coursesApi from "@/lib/api/resources/courses";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** Only report progress to the server when it's actually moved forward by
 * this much (or on pause/end, unconditionally) — `timeupdate` fires several
 * times a second, and there's no reason to mutate that often. */
const REPORT_THRESHOLD_SECONDS = 3;
/** How far ahead of the furthest-watched point a seek is allowed to land
 * before getting snapped back — small enough to still block "drag to the
 * end", generous enough that normal buffering/timeupdate jitter never
 * triggers it. */
const SEEK_TOLERANCE_SECONDS = 1;

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
 *
 * Forward-seek blocking is the same story: a real anti-cheat measure, not
 * a hard guarantee (devtools can still call the tRPC mutation directly —
 * `courses.setLessonComplete` re-checks the server-recorded furthest point
 * for exactly that reason, so the actual enforcement doesn't live here).
 * This component's job is just to make the honest path the only
 * practical one: dragging the scrubber past what's actually been watched
 * snaps straight back.
 */
export function CourseVideoPlayer({
  src,
  lessonId,
  initialFurthestSeconds = 0,
  onEnded,
}: {
  src: string;
  /** Lesson this video belongs to — required to report/restore progress.
   * Omit only for contexts with no completion tracking at all. */
  lessonId?: string;
  /** Resume point for seek-blocking, from `courses.getVideoProgress`. */
  initialFurthestSeconds?: number;
  /** Fires once, when the video reaches its real end (not from a blocked
   * seek) — the caller decides what "actually finished" means from here. */
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);

  const furthestRef = useRef(initialFurthestSeconds);
  const lastReportedRef = useRef(initialFurthestSeconds);
  const resettingRef = useRef(false);
  const endedRef = useRef(false);

  useEffect(() => {
    furthestRef.current = initialFurthestSeconds;
    lastReportedRef.current = initialFurthestSeconds;
  }, [initialFurthestSeconds]);

  function report(currentTime: number, duration: number, force: boolean) {
    if (!lessonId || !Number.isFinite(duration) || duration <= 0) return;
    if (!force && currentTime - lastReportedRef.current < REPORT_THRESHOLD_SECONDS) return;
    lastReportedRef.current = currentTime;
    coursesApi.reportVideoProgress(lessonId, currentTime, duration).catch(() => {
      // Best-effort — a dropped report just means slightly less resume
      // precision, not a broken lesson; the next tick tries again.
    });
  }

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
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          if (initialFurthestSeconds > 0 && initialFurthestSeconds < video.duration - SEEK_TOLERANCE_SECONDS) {
            video.currentTime = initialFurthestSeconds;
          }
        }}
        onSeeking={(e) => {
          const video = e.currentTarget;
          if (resettingRef.current) return;
          if (video.currentTime > furthestRef.current + SEEK_TOLERANCE_SECONDS) {
            resettingRef.current = true;
            video.currentTime = furthestRef.current;
          }
        }}
        onSeeked={() => {
          resettingRef.current = false;
        }}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (resettingRef.current) return;
          if (video.currentTime > furthestRef.current) furthestRef.current = video.currentTime;
          report(video.currentTime, video.duration, false);
        }}
        onPause={(e) => {
          const video = e.currentTarget;
          report(furthestRef.current, video.duration, true);
        }}
        onEnded={async (e) => {
          const video = e.currentTarget;
          furthestRef.current = video.duration;
          if (endedRef.current) return;
          endedRef.current = true;
          // Awaited, unlike the throttled `report()` calls above — the
          // caller is about to try marking the lesson complete, which the
          // server checks against exactly this row. A fire-and-forget call
          // here could still be in flight when that check runs, failing a
          // fully-watched video for a race, not a real problem.
          if (lessonId) {
            try {
              await coursesApi.reportVideoProgress(lessonId, video.duration, video.duration);
            } catch {
              // Best-effort — if this fails, the completion check below will
              // (correctly) also fail, and the learner can just replay the
              // last moment rather than getting stuck silently.
            }
          }
          onEnded?.();
        }}
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
