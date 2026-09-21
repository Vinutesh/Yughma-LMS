"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, FileText, Film, Package, Lock } from "lucide-react";
import { CourseVideoPlayer } from "@/components/courses/CourseVideoPlayer";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import * as coursesApi from "@/lib/api/resources/courses";
import * as contentApi from "@/lib/api/resources/content";
import * as assignmentsApi from "@/lib/api/resources/assignments";
import { isAssignmentPassed } from "@/lib/api/resources/assignments";

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
  const scormAdvancedRef = useRef<string | null>(null);
  // Only set once the learner actually clicks "Start lesson" this visit —
  // without it, simply reopening an already-completed SCORM lesson to
  // review it would immediately trigger the same auto-advance a genuine
  // just-now completion does.
  const scormStartedRef = useRef<string | null>(null);

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

  // So finishing the last lesson can go straight to the course's qualifying
  // assessment instead of just back to the (now-empty) course overview —
  // see `goNext` below.
  const { data: myAssignments = [] } = useQuery({
    queryKey: ["myAssignments", session?.user.id],
    queryFn: () => assignmentsApi.listMyAssignments(),
    enabled: enrolled,
  });
  const qualifyingAssignment = myAssignments.find((a) => a.courseId === courseId && a.isQualifying);
  const needsAssessment = !!qualifyingAssignment && !isAssignmentPassed(qualifyingAssignment);

  const toggleComplete = useMutation({
    mutationFn: (value: boolean) => coursesApi.setLessonComplete(course!.enrollment!.id, lessonId, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["myCourses"] });
    },
  });

  function goNext() {
    const next = allLessons[index + 1];
    if (next) {
      router.push(`/courses/${courseId}/lessons/${next.id}`);
    } else if (needsAssessment) {
      // Every lesson just finished and there's a qualifying assessment
      // still standing between here and the certificate — go straight to
      // it instead of the course overview, so finishing the last video is
      // what actually prompts taking the assessment, not something the
      // learner has to notice on their own.
      router.push(`/assignments/${qualifyingAssignment!.id}`);
    } else {
      router.push(`/courses/${courseId}`);
    }
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

  // A SCORM lesson now finishes in its own tab (see the "Start lesson"
  // button below) — this tab has no direct signal that it closed, so
  // refetch on refocus, same as the assignment page's equivalent tab flow.
  useEffect(() => {
    function onFocus() {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["myCourses"] });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [courseId, qc]);

  // Once that refetch shows the SCORM lesson actually completed (the
  // webhook already recorded it server-side before this tab regained
  // focus), trigger the same "moving on" transition a video's onEnded
  // would — guarded by a ref so returning to an already-advanced lesson
  // doesn't replay it.
  useEffect(() => {
    if (lesson?.contentType !== "scorm" || !complete) return;
    if (scormStartedRef.current !== lesson.id) return;
    if (scormAdvancedRef.current === lesson.id) return;
    scormAdvancedRef.current = lesson.id;
    startAdvancing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, lesson?.contentType, complete]);

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
    const headingToAssessment = !allLessons[index + 1] && needsAssessment;
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-2 p-8 text-center">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <p className="text-lg font-semibold text-text-primary">
          {headingToAssessment ? "All lessons done — on to the assessment..." : "Nice work — moving on..."}
        </p>
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
            <Card className="flex flex-col items-center gap-3 p-8 text-center">
              <p className="text-sm text-text-secondary">
                {complete
                  ? "You've finished this. Reopen it any time to review."
                  : "This opens in a new, fullscreen tab. Finish it there — this page updates on its own once you're done and back here."}
              </p>
              <Button
                onClick={() => {
                  scormStartedRef.current = lesson.id;
                  window.open(`/courses/${courseId}/lessons/${lesson.id}/play`, "_blank");
                }}
              >
                <ExternalLink className="mr-1.5 size-3.5" aria-hidden />
                {complete ? "Reopen lesson" : "Start lesson"}
              </Button>
            </Card>
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

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        {/* Always enabled, regardless of completion — leaving to the course
            overview never lets anyone skip past required content, so there's
            no reason this should ever be blocked. It used to be bundled into
            the same disabled button as "Next lesson" on the last lesson,
            which meant an unfinished final lesson had no working way back at
            all. */}
        <Button variant="secondary" onClick={() => router.push(`/courses/${courseId}`)}>
          Back to course
        </Button>
        {next && (
          <Button
            disabled={!complete}
            title={complete ? undefined : "Finish this lesson to continue"}
            onClick={() => router.push(`/courses/${courseId}/lessons/${next.id}`)}
          >
            Next lesson →
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
