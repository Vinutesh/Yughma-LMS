"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, FileText, Film, Package, Lock } from "lucide-react";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { CourseVideoPlayer } from "@/components/courses/CourseVideoPlayer";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import * as coursesApi from "@/lib/api/resources/courses";
import * as contentApi from "@/lib/api/resources/content";

/** How long the "Nice work — moving on..." transition shows before
 * auto-navigating, once a video ends or a SCORM package reports done. */
const ADVANCE_DELAY_MS = 2000;

export default function LessonViewerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const router = useRouter();
  const [linkConfirm, setLinkConfirm] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const autoCompletedRef = useRef<string | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId, session?.user.id],
    queryFn: () => coursesApi.getCourse(courseId, true),
    enabled: !!session,
  });

  const allLessons = course?.outline.flatMap((m) => m.lessons) ?? [];
  const index = allLessons.findIndex((l) => l.id === lessonId);
  const lesson = allLessons[index];
  const enrolled = !!course?.enrollment && course.enrollment.status !== "requested";
  const complete = !!course?.enrollment?.completedLessonIds.includes(lessonId);

  // Enrollment-gated server-side (see `content.ts` router's
  // `getLessonAssetUrl`) — scoped to exactly this lesson's asset rather than
  // the whole content library, which a plain Learner has no permission to
  // list at all.
  const { data: lessonAsset } = useQuery({
    queryKey: ["lessonAsset", lessonId],
    queryFn: () => contentApi.getLessonAssetUrl(lessonId),
    enabled: !!lesson?.assetId && enrolled,
  });

  const { data: videoProgress } = useQuery({
    queryKey: ["videoProgress", lessonId],
    queryFn: () => coursesApi.getVideoProgress(lessonId),
    enabled: enrolled && lesson?.contentType === "video",
  });

  const toggleComplete = useMutation({
    mutationFn: (value: boolean) => coursesApi.setLessonComplete(course!.enrollment!.id, lessonId, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["myCourses"] });
    },
  });

  function goNext() {
    const next = allLessons[index + 1];
    if (next) router.push(`/courses/${courseId}/lessons/${next.id}`);
    else router.push(`/courses/${courseId}`);
  }

  /** Video ending / SCORM reporting done are the only two "genuinely
   * finished" moments — this is what earns the auto-advance transition.
   * Text/file/link auto-complete silently on open instead (see the effect
   * below); nothing to celebrate there, the learner hasn't done anything
   * yet. */
  function startAdvancing() {
    setAdvancing(true);
    qc.invalidateQueries({ queryKey: ["course", courseId] });
    qc.invalidateQueries({ queryKey: ["myCourses"] });
    setTimeout(goNext, ADVANCE_DELAY_MS);
  }

  /** The video path still has to actually write completion (unlike SCORM,
   * whose webhook already recorded it server-side by the time `onComplete`
   * fires) — `CourseVideoPlayer` has already awaited the final progress
   * report before calling this, so the server-side duration check below
   * should pass for anyone who genuinely watched to the end. */
  function handleVideoEnded() {
    toggleComplete.mutate(true, { onSuccess: startAdvancing });
  }

  // Text/file/link lessons have no "play to the end" signal to auto-detect
  // — per the client's own call, opening the lesson is the completion
  // signal for these three types. Guarded by a ref (not just `!complete`)
  // so a slow mutation response between renders can't fire it twice.
  useEffect(() => {
    if (!enrolled || !lesson || complete) return;
    if (lesson.contentType !== "text" && lesson.contentType !== "file" && lesson.contentType !== "link") return;
    if (autoCompletedRef.current === lesson.id) return;
    autoCompletedRef.current = lesson.id;
    toggleComplete.mutate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrolled, lesson?.id, lesson?.contentType, complete]);

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading lesson...</p>;
  if (!course) return <p className="p-8 text-sm text-text-tertiary">Course not found.</p>;
  if (!lesson) return <p className="p-8 text-sm text-text-tertiary">Lesson not found.</p>;
  if (!enrolled) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Link href={`/courses/${courseId}`} className="text-sm font-medium text-accent hover:underline">
          ← {course.title}
        </Link>
        <EmptyState
          icon={Lock}
          className="mt-4"
          title="You're not enrolled yet"
          description="Enroll from the course page to open its lessons."
        />
      </div>
    );
  }

  if (advancing) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-2 p-8 text-center">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <p className="text-lg font-semibold text-text-primary">Nice work — moving on...</p>
      </div>
    );
  }

  const next = allLessons[index + 1];
  const asset = lessonAsset;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/courses/${courseId}`}
          className="text-sm font-medium text-accent hover:underline"
        >
          ← {course.title}
        </Link>
        <span className="text-xs tabular-nums text-text-tertiary">
          Lesson {index + 1} of {allLessons.length}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <h1 className="text-xl font-semibold text-text-primary">{lesson.title}</h1>
        {complete && <Badge variant="success">Done</Badge>}
      </div>

      {lesson.contentType === "text" && (
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-text-secondary">
          {(lesson.body ?? "").trim() ? (
            lesson.body!.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
          ) : (
            <p className="text-text-tertiary">This lesson has no content yet.</p>
          )}
        </div>
      )}

      {lesson.contentType === "video" &&
        (asset?.url ? (
          <CourseVideoPlayer
            key={lesson.id}
            src={asset.url}
            lessonId={lesson.id}
            initialFurthestSeconds={videoProgress?.furthestSeconds ?? 0}
            onEnded={handleVideoEnded}
          />
        ) : (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Film className="size-8 text-text-tertiary" />
            <p className="text-sm font-medium text-text-primary">
              {asset ? asset.name : "No content attached"}
            </p>
            <p className="text-xs text-text-tertiary">
              {asset
                ? "This video isn't playable yet — file storage may not be configured."
                : "The instructor hasn't attached a file yet."}
            </p>
          </Card>
        ))}

      {lesson.contentType === "file" && (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <FileText className="size-8 text-text-tertiary" />
          <p className="text-sm font-medium text-text-primary">
            {asset ? asset.name : "No content attached"}
          </p>
          {asset?.url ? (
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-accent hover:underline"
            >
              Download
            </a>
          ) : (
            <p className="text-xs text-text-tertiary">
              {asset
                ? "This file isn't downloadable yet — file storage may not be configured."
                : "The instructor hasn't attached a file yet."}
            </p>
          )}
        </Card>
      )}

      {lesson.contentType === "scorm" && (
        <>
          {lesson.scormStatus === "processing" ? (
            <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
              <Package className="size-8 text-text-tertiary" />
              <p className="text-sm font-medium text-text-primary">Package is still processing</p>
              <p className="text-xs text-text-tertiary">Check back in a moment.</p>
            </Card>
          ) : (
            <ScormPlayer
              target={{ lessonId: lesson.id }}
              title={lesson.title}
              onComplete={startAdvancing}
            />
          )}
        </>
      )}

      {lesson.contentType === "link" && (
        <Card className="flex flex-col items-start gap-2 p-6">
          <p className="text-sm text-text-secondary">This lesson points at an external resource.</p>
          <Button
            variant="secondary"
            size="sm"
            disabled={!lesson.url}
            onClick={() => setLinkConfirm(true)}
          >
            <ExternalLink className="size-3.5" />
            {lesson.url ? "Open resource" : "No URL set"}
          </Button>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
        {complete ? (
          next ? (
            <Button onClick={() => router.push(`/courses/${courseId}/lessons/${next.id}`)}>
              Next lesson →
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => router.push(`/courses/${courseId}`)}>
              Back to course
            </Button>
          )
        ) : (
          <Button disabled title="Finish this lesson to continue">
            {next ? "Next lesson →" : "Back to course"}
          </Button>
        )}
      </div>

      <Dialog open={linkConfirm} onOpenChange={setLinkConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>This opens an external site</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium text-text-primary">{lesson.title}</p>
          <p className="break-all text-xs text-text-tertiary">{lesson.url}</p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setLinkConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                window.open(lesson.url, "_blank", "noopener,noreferrer");
                setLinkConfirm(false);
              }}
            >
              Continue →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
