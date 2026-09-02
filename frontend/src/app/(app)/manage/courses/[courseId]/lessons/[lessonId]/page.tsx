"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ContentLibrary } from "@/components/content/ContentLibrary";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as coursesApi from "@/lib/api/resources/courses";
import * as contentApi from "@/lib/api/resources/content";
import type { Lesson } from "@/types/domain";

export default function LessonEditorPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const canEdit = usePermission("courses", "edit");

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => coursesApi.getCourse(courseId),
    enabled: canEdit,
  });

  const lesson = course?.outline.flatMap((m) => m.lessons).find((l) => l.id === lessonId);

  if (!canEdit) return <AccessDenied title="Lesson editor" />;
  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading lesson...</p>;
  if (!course || !lesson) return <p className="p-8 text-sm text-text-tertiary">Lesson not found.</p>;

  // Keyed on the lesson so the fields initialize from it once, rather than
  // being resynced by an effect on every refetch.
  return (
    <LessonEditor key={lesson.id} courseId={courseId} courseTitle={course.title} lesson={lesson} />
  );
}

function LessonEditor({
  courseId,
  courseTitle,
  lesson,
}: {
  courseId: string;
  courseTitle: string;
  lesson: Lesson;
}) {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();

  const [title, setTitle] = useState(lesson.title);
  const [body, setBody] = useState(lesson.body ?? "");
  const [url, setUrl] = useState(lesson.url ?? "");
  const [minutes, setMinutes] = useState(
    lesson.estimatedMinutes ? String(lesson.estimatedMinutes) : "",
  );
  const [saved, setSaved] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", org?.id],
    queryFn: () => contentApi.listAssets(),
    enabled: !!org,
  });

  const save = useMutation({
    mutationFn: () =>
      coursesApi.updateLesson(courseId, lesson.id, {
        title,
        body: lesson.contentType === "text" ? body : undefined,
        url: lesson.contentType === "link" ? url : undefined,
        estimatedMinutes: minutes ? Number(minutes) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const swapAsset = useMutation({
    mutationFn: (assetId: string) => coursesApi.updateLesson(courseId, lesson.id, { assetId }),
    onSuccess: () => {
      setSwapOpen(false);
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const attached = assets.find((a) => a.id === lesson.assetId);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href={`/manage/courses/${courseId}`}
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Back to {courseTitle}
      </Link>

      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold text-text-primary">Edit lesson</h1>
        <Badge variant="neutral" className="capitalize">
          {lesson.contentType}
        </Badge>
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="l-title">Lesson name</Label>
          <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {lesson.contentType === "text" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-body">Content</Label>
            <textarea
              id="l-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write the lesson here..."
              className="rounded-md border border-border bg-surface p-3 text-sm leading-relaxed text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>
        )}

        {lesson.contentType === "link" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-url">URL</Label>
            <Input
              id="l-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}

        {(lesson.contentType === "video" || lesson.contentType === "file") && (
          <div className="flex flex-col gap-1.5">
            <Label>Attached content</Label>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm text-text-secondary">
                {attached ? attached.name : "Nothing attached"}
              </span>
              <Button size="sm" variant="secondary" onClick={() => setSwapOpen(true)}>
                {attached ? "Replace" : "Choose"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="l-minutes">Estimated minutes</Label>
          <Input
            id="l-minutes"
            type="number"
            min={0}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="max-w-32"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button disabled={!title.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
          {saved && <span className="text-xs font-medium text-success">Saved</span>}
        </div>
      </Card>

      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose content</DialogTitle>
          </DialogHeader>
          <ContentLibrary mode="picker" onUseSelected={(asset) => swapAsset.mutate(asset.id)} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSwapOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
