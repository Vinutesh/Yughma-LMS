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
 * `sandbox="allow-scripts"` only — deliberately without `allow-same-origin`,
 * even though `src` now points at this app's own `/api/scorm/...` route
 * rather than a truly separate domain. That combination still forces an
 * opaque ("null") origin regardless of what URL the iframe loads — the
 * package can run its own JS but has no origin to attack from, can't read
 * this app's cookies/localStorage/session, and can't reach into the parent
 * DOM. The real progress-tracking API (`window.API`/`window.API_1484_11`)
 * is injected directly into the package's *own* document server-side (see
 * backend/src/scorm/shim.ts) specifically so the package's own SCORM calls
 * never need to cross that boundary at all.
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
          sandbox="allow-scripts"
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
