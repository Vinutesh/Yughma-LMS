"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Maximize, Minimize } from "lucide-react";
import * as scormApi from "@/lib/api/resources/scorm";
import { Button } from "@/components/ui/Button";

/**
 * Renders SCORM content inside a sandboxed iframe, on message-passing terms
 * only — this is the one piece of frontend logic from the SCORM/xAPI module
 * that's genuinely security-relevant regardless of backend status. See
 * SECURITY_REVIEW.md: a SCORM package is a learner- or instructor-uploaded
 * zip full of HTML/CSS/JS that executes in the browser, and must never be
 * trusted the way first-party app code is.
 *
 * Sandbox is `allow-scripts` only when `data.crossOrigin` is false — the
 * package is served from this app's own origin, so adding
 * `allow-same-origin` there would let it fully script this real page
 * (read the learner's session token, cookies, everything). Real
 * authoring-tool output (Storyline, Captivate, iSpring — all bundle
 * Rustici's SCORM Driver) can't actually run in that mode: its API
 * discovery only ever walks `window.parent`/`window.top.opener`, never its
 * own window, so it needs real cross-frame property access to find
 * `window.API`. `data.crossOrigin` is true exactly when `scorm.getLaunchUrl`
 * handed back a URL on the dedicated, isolated SCORM_CONTENT_ORIGIN (see
 * that mutation's own doc comment) — there, and only there, is it safe to
 * add `allow-same-origin`: the package's own origin is that isolated host,
 * never this app's, so even fully scripting its own frame tree reaches
 * nothing of the real app's session/cookies/DOM.
 */
export function ScormPlayer({
  target,
  title,
  onComplete,
  fill = false,
}: {
  /** Which the package belongs to — a lesson or an assignment. Exactly one,
   * mirroring `ScormLaunchToken`'s own shape on the backend. */
  target: { lessonId: string } | { assignmentId: string };
  title: string;
  onComplete?: () => void;
  /** For the dedicated, already-fullscreen `(focus)` play pages — stretches
   * to fill the parent instead of a fixed height, and hides this
   * component's own fullscreen toggle (the page itself already handles
   * fullscreen one level up; a second, nested toggle here would fight it). */
  fill?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [percent, setPercent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["scormLaunchUrl", target],
    queryFn: () => scormApi.getScormLaunchUrl(target),
  });

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type !== "scorm:progress") return;
      const value = Math.max(0, Math.min(100, Number(e.data.percent) || 0));
      setPercent(value);
      if (value >= 100) onComplete?.();
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onComplete]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  if (isLoading) {
    return <p className="p-6 text-sm text-text-tertiary">Loading package...</p>;
  }
  if (error || !data) {
    return (
      <p className="rounded-md bg-danger-bg p-3 text-sm font-medium text-danger">
        Couldn&apos;t open this package. Try reopening the lesson.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={"flex flex-col gap-2" + (fill ? " h-full min-h-0 flex-1" : isFullscreen ? " h-dvh bg-canvas p-3" : "")}
    >
      <div
        className={
          "relative overflow-hidden rounded-lg border border-border" +
          (fill || isFullscreen ? " min-h-0 flex-1" : "")
        }
      >
        <iframe
          ref={iframeRef}
          title={title}
          sandbox={data.crossOrigin ? "allow-scripts allow-same-origin allow-forms allow-popups" : "allow-scripts"}
          allow="fullscreen"
          src={data.url}
          className={fill || isFullscreen ? "h-full w-full bg-white" : "h-[32rem] w-full bg-white"}
        />
        {!fill && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={toggleFullscreen}
            className="absolute right-2 top-2 bg-surface/90 backdrop-blur"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        <span className="w-10 text-right text-xs tabular-nums text-text-tertiary">{percent}%</span>
      </div>
    </div>
  );
}
