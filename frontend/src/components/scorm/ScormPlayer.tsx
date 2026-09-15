"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as scormApi from "@/lib/api/resources/scorm";

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
export function ScormPlayer({ lessonId, title, onComplete }: { lessonId: string; title: string; onComplete?: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [percent, setPercent] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["scormLaunchUrl", lessonId],
    queryFn: () => scormApi.getScormLaunchUrl(lessonId),
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
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-border">
        <iframe
          ref={iframeRef}
          title={title}
          sandbox={data.crossOrigin ? "allow-scripts allow-same-origin allow-forms allow-popups" : "allow-scripts"}
          src={data.url}
          className="h-[32rem] w-full bg-white"
        />
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
