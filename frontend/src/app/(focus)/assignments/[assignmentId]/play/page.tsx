"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Maximize } from "lucide-react";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { Button } from "@/components/ui/Button";
import { useSessionStore } from "@/state/sessionStore";
import { useAutoFullscreen } from "@/lib/useAutoFullscreen";
import * as assignmentsApi from "@/lib/api/resources/assignments";

/**
 * A dedicated, chrome-free tab for finishing a SCORM assignment (see the
 * `(focus)` layout's own doc comment) — opened via `window.open` from the
 * main assignment page. Still hosts the same sandboxed `ScormPlayer`
 * iframe as everywhere else, on this app's own trusted page, rather than
 * navigating this whole tab directly to the uploaded package's own files
 * (see ScormPlayer.tsx's doc comment for why that would be dangerous).
 */
export default function PlayAssignmentPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const session = useSessionStore((s) => s.session);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { blocked, enter } = useAutoFullscreen(containerRef);

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", assignmentId, session?.user.id],
    queryFn: () => assignmentsApi.getAssignment(assignmentId, true),
    enabled: !!session,
  });

  function finish() {
    setDone(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimeout(() => window.close(), 1800);
  }

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading...</p>;
  if (!assignment) return <p className="p-8 text-sm text-text-tertiary">Assignment not found.</p>;

  return (
    <div ref={containerRef} className="flex h-dvh w-full flex-col bg-canvas p-4">
      {done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
          <p className="text-lg font-semibold text-text-primary">Nice work — you&apos;re done</p>
          <p className="text-sm text-text-tertiary">This tab will close automatically...</p>
        </div>
      ) : (
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-3">
          <div className="flex shrink-0 items-center justify-between">
            <h1 className="text-lg font-semibold text-text-primary">{assignment.title}</h1>
            {blocked && (
              <Button size="sm" variant="secondary" onClick={enter}>
                <Maximize className="mr-1.5 size-3.5" aria-hidden />
                Enter fullscreen
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <ScormPlayer target={{ assignmentId: assignment.id }} title={assignment.title} onComplete={finish} fill />
          </div>
        </div>
      )}
    </div>
  );
}
