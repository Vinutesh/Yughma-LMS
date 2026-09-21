"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import * as coursesApi from "@/lib/api/resources/courses";

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
 * Course lesson video — no native browser controls at all, per client
 * request: no scrubber to drag, no playback-speed menu, nothing but
 * play/pause. `controls` being absent removes the browser's own seek UI and
 * the keyboard shortcuts tied to it; the click-to-toggle play/pause below is
 * this component's own, deliberately minimal, replacement.
 *
 * `onContextMenu` blocks the right-click "Save video as..." escape hatch —
 * not a hard technical guarantee against extraction (nothing rendered in a
 * browser ever is — dev tools or a plain network-tab save always remain
 * possible), but it removes the one-click affordance a learner would
 * otherwise see.
 *
 * Forward-seek blocking is the same story: a real anti-cheat measure, not
 * a hard guarantee (devtools can still call the tRPC mutation directly —
 * `courses.setLessonComplete` re-checks the server-recorded furthest point
 * for exactly that reason, so the actual enforcement doesn't live here).
 * With no visible scrubber there's no *normal* way to attempt a seek at
 * all, but this stays as defense-in-depth against a `currentTime` set
 * directly (devtools, an extension) rather than through this UI.
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
  const [playing, setPlaying] = useState(false);
  const [percent, setPercent] = useState(0);

  const furthestRef = useRef(initialFurthestSeconds);
  const lastReportedRef = useRef(initialFurthestSeconds);
  const resettingRef = useRef(false);
  const endedRef = useRef(false);

  function report(currentTime: number, duration: number, force: boolean) {
    if (!lessonId || !Number.isFinite(duration) || duration <= 0) return;
    if (!force && currentTime - lastReportedRef.current < REPORT_THRESHOLD_SECONDS) return;
    lastReportedRef.current = currentTime;
    coursesApi.reportVideoProgress(lessonId, currentTime, duration).catch(() => {
      // Best-effort — a dropped report just means slightly less resume
      // precision, not a broken lesson; the next tick tries again.
    });
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }

  return (
    <div className="relative overflow-hidden rounded-md bg-black">
      <video
        ref={videoRef}
        src={src}
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={(e) => {
          setPlaying(false);
          report(furthestRef.current, e.currentTarget.duration, true);
        }}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          if (initialFurthestSeconds > 0 && initialFurthestSeconds < video.duration - SEEK_TOLERANCE_SECONDS) {
            video.currentTime = initialFurthestSeconds;
          }
          if (video.duration > 0) setPercent((furthestRef.current / video.duration) * 100);
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
          if (video.duration > 0) setPercent((furthestRef.current / video.duration) * 100);
          report(video.currentTime, video.duration, false);
        }}
        onEnded={async (e) => {
          const video = e.currentTarget;
          furthestRef.current = video.duration;
          setPlaying(false);
          setPercent(100);
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
        className="w-full cursor-pointer"
      />

      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-black shadow-(--shadow-token-lg)">
            <Play className="size-7 translate-x-0.5" fill="currentColor" aria-hidden />
          </span>
        </button>
      )}

      {playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Pause"
          className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
        >
          <Pause className="size-4" fill="currentColor" aria-hidden />
        </button>
      )}

      {/* Purely a "how far along am I" indicator, never a scrubber — there
          is deliberately no click/drag handler on this bar. */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
