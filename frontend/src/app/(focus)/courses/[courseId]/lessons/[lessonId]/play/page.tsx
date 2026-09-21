"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Maximize } from "lucide-react";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { Button } from "@/components/ui/Button";
import { useSessionStore } from "@/state/sessionStore";
import { useFullscreenState } from "@/lib/useAutoFullscreen";
import * as coursesApi from "@/lib/api/resources/courses";

/**
 * A dedicated, chrome-free tab for a SCORM lesson — the lesson viewer page
 * opens this via `window.open` instead of embedding the package inline,
 * same reasoning and same `(focus)` layout as the assignment play page.
 * Completion is recorded server-side by the SCORM progress webhook exactly
 * as before; the original lesson tab notices on refocus (it has no other
 * way to know this tab closed) and handles its own "moving on" transition.
 *
 * Starts behind a "Begin" gate rather than auto-requesting fullscreen on
 * mount — see `useFullscreenState`'s own doc comment and the assignment
 * play page's matching comment for why the gate replaced that.
 */
export default function PlayLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const session = useSessionStore((s) => s.session);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, enter } = useFullscreenState(containerRef);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId, session?.user.id],
    queryFn: () => coursesApi.getCourse(courseId, true),
    enabled: !!session,
  });

  const lesson = course?.outline.flatMap((m) => m.lessons).find((l) => l.id === lessonId);

  function begin() {
    setStarted(true);
    enter();
  }

  function finish() {
    setDone(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimeout(() => window.close(), 1800);
  }

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading...</p>;
  if (!lesson) return <p className="p-8 text-sm text-text-tertiary">Lesson not found.</p>;

  return (
    <div ref={containerRef} className="relative flex h-dvh w-full flex-col bg-canvas">
      {done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
          <p className="text-lg font-semibold text-text-primary">Nice work — you&apos;re done</p>
          <p className="text-sm text-text-tertiary">This tab will close automatically...</p>
        </div>
      ) : !started ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <h1 className="text-lg font-semibold text-text-primary">{lesson.title}</h1>
          <p className="max-w-sm text-sm text-text-tertiary">
            This opens in fullscreen. Stay on this tab until you&apos;re done.
          </p>
          <Button onClick={begin}>
            <Maximize className="mr-1.5 size-3.5" aria-hidden />
            Begin lesson
          </Button>
        </div>
      ) : (
        <>
          {!isFullscreen && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute right-3 top-3 z-10"
              onClick={enter}
            >
              <Maximize className="mr-1.5 size-3.5" aria-hidden />
              Enter fullscreen
            </Button>
          )}
          <div className="min-h-0 flex-1">
            <ScormPlayer target={{ lessonId: lesson.id }} title={lesson.title} onComplete={finish} fill />
          </div>
        </>
      )}
    </div>
  );
}
