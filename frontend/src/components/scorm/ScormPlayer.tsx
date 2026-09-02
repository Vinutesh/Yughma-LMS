"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders SCORM content inside a sandboxed iframe, on message-passing terms
 * only — this is the one piece of frontend logic from the SCORM/xAPI module
 * that's genuinely security-relevant regardless of backend status. See
 * SECURITY_REVIEW.md: a SCORM package is a learner- or instructor-uploaded
 * zip full of HTML/CSS/JS that executes in the browser, and must never be
 * trusted the way first-party app code is.
 *
 * `sandbox="allow-scripts"` only — deliberately without `allow-same-origin`.
 * For `srcDoc` content specifically, adding `allow-same-origin` doesn't grant
 * the package its own isolated origin; it grants it the *parent page's*
 * origin (a well-known sandbox footgun), which would hand uploaded content
 * exactly the DOM/cookie/session access this module exists to deny. Without
 * it, the iframe's origin is opaque ("null") — the package can run its own
 * JS but has no origin to attack from. Progress/completion comes back via
 * `postMessage` only, never a direct call into parent-frame JavaScript.
 *
 * A real implementation additionally serves `src` from an isolated content
 * domain (never the app's own origin) rather than `srcDoc` — at that point
 * `allow-same-origin` becomes safe to add back, because "the package's own
 * origin" is a real, different-from-the-app origin rather than a stand-in for
 * the parent's. This mock renders self-contained placeholder content via
 * `srcDoc` since there's no backend yet to host an extracted package, but the
 * isolation contract above is the part that must survive into production
 * unchanged.
 */
export function ScormPlayer({
  title,
  onProgress,
}: {
  title: string;
  onProgress?: (percent: number) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type !== "scorm:progress") return;
      const value = Math.max(0, Math.min(100, Number(e.data.percent) || 0));
      setPercent(value);
      onProgress?.(value);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onProgress]);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-border">
        <iframe
          ref={iframeRef}
          title={title}
          sandbox="allow-scripts"
          srcDoc={MOCK_SCO_HTML}
          className="h-96 w-full bg-white"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <span className="w-10 text-right text-xs tabular-nums text-text-tertiary">{percent}%</span>
      </div>
    </div>
  );
}

/**
 * Stands in for a real extracted SCO — talks to the parent exclusively via
 * postMessage, exactly as a real package's JS runtime would be constrained
 * to. Inlined as a string (not a separate served file) since there's nowhere
 * real to host package output yet; a real implementation swaps this `srcDoc`
 * for `src="https://content.<isolated-domain>/<package>/index.html"`.
 */
const MOCK_SCO_HTML = `<!doctype html>
<html>
<head><style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #333; }
  button { margin-top: 12px; padding: 8px 16px; cursor: pointer; }
</style></head>
<body>
  <h3>Mock SCORM content</h3>
  <p>A real package's own HTML/JS renders here, sandboxed.</p>
  <button onclick="advance()">Mark next section complete</button>
  <script>
    let percent = 0;
    function advance() {
      percent = Math.min(100, percent + 25);
      parent.postMessage({ type: "scorm:progress", percent }, "*");
    }
  </script>
</body>
</html>`;
