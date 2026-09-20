"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Maximize } from "lucide-react";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { Button } from "@/components/ui/Button";
import { useSessionStore } from "@/state/sessionStore";
import { useAutoFullscreen } from "@/lib/useAutoFullscreen";
import * as coursesApi from "@/lib/api/resources/courses";

/**
 * A dedicated, chrome-free tab for a SCORM lesson — the lesson viewer page
 * opens this via `window.open` instead of embedding the package inline,
 * same reasoning and same `(focus)` layout as the assignment play page.
 * Completion is recorded server-side by the SCORM progress webhook exactly
 * as before; the original lesson tab notices on refocus (it has no other
 * way to know this tab closed) and handles its own "moving on" transition.
 */
export default function PlayLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const session = useSessionStore((s) => s.session);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { blocked, enter } = useAutoFullscreen(containerRef);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId, session?.user.id],
    queryFn: () => coursesApi.getCourse(courseId, true),
    enabled: !!session,
  });

  const lesson = course?.outline.flatMap((m) => m.lessons).find((l) => l.id === lessonId);

  function finish() {
    setDone(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimeout(() => window.close(), 1800);
  }

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading...</p>;
  if (!lesson) return <p className="p-8 text-sm text-text-tertiary">Lesson not found.</p>;

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
            <h1 className="text-lg font-semibold text-text-primary">{lesson.title}</h1>
            {blocked && (
              <Button size="sm" variant="secondary" onClick={enter}>
                <Maximize className="mr-1.5 size-3.5" aria-hidden />
                Enter fullscreen
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <ScormPlayer target={{ lessonId: lesson.id }} title={lesson.title} onComplete={finish} fill />
          </div>
        </div>
      )}
    </div>
  );
}
