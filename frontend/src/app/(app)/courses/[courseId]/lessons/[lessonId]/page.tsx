"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, FileText, Film, Package } from "lucide-react";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import * as coursesApi from "@/lib/api/resources/courses";
import * as contentApi from "@/lib/api/resources/content";

export default function LessonViewerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const router = useRouter();
  const [linkConfirm, setLinkConfirm] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId, session?.user.id],
    queryFn: () => coursesApi.getCourse(courseId, true),
    enabled: !!session,
  });

  const allLessons = course?.outline.flatMap((m) => m.lessons) ?? [];
  const index = allLessons.findIndex((l) => l.id === lessonId);
  const lesson = allLessons[index];
  const enrolled = !!course?.enrollment && course.enrollment.status !== "requested";

  // Enrollment-gated server-side (see `content.ts` router's
  // `getLessonAssetUrl`) — scoped to exactly this lesson's asset rather than
  // the whole content library, which a plain Learner has no permission to
  // list at all.
  const { data: lessonAsset } = useQuery({
    queryKey: ["lessonAsset", lessonId],
    queryFn: () => contentApi.getLessonAssetUrl(lessonId),
    enabled: !!lesson?.assetId && enrolled,
  });

  const toggleComplete = useMutation({
    mutationFn: (complete: boolean) =>
      coursesApi.setLessonComplete(course!.enrollment!.id, lessonId, complete),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["myCourses"] });
    },
  });

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading lesson...</p>;
  if (!course) return <p className="p-8 text-sm text-text-tertiary">Course not found.</p>;
  if (!lesson) return <p className="p-8 text-sm text-text-tertiary">Lesson not found.</p>;
  if (!enrolled) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Link href={`/courses/${courseId}`} className="text-sm font-medium text-accent hover:underline">
          ← {course.title}
        </Link>
        <Card className="mt-4 flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">You&apos;re not enrolled yet</p>
          <p className="text-xs text-text-tertiary">
            Enroll from the course page to open its lessons.
          </p>
        </Card>
      </div>
    );
  }

  const complete = course.enrollment!.completedLessonIds.includes(lesson.id);
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
          <video key={lesson.id} src={asset.url} controls className="w-full rounded-md bg-black" />
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
            <ScormPlayer title={lesson.title} />
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
        <Button
          variant={complete ? "ghost" : "secondary"}
          loading={toggleComplete.isPending}
          onClick={() => toggleComplete.mutate(!complete)}
        >
          {complete ? (
            <>
              <Check className="size-4" />
              Completed
            </>
          ) : (
            "Mark complete"
          )}
        </Button>
        {next ? (
          <Button onClick={() => router.push(`/courses/${courseId}/lessons/${next.id}`)}>
            Next lesson →
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => router.push(`/courses/${courseId}`)}>
            Back to course
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
