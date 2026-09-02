"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlignLeft, FileText, Film, Link2, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ContentLibrary } from "@/components/content/ContentLibrary";
import * as coursesApi from "@/lib/api/resources/courses";
import type { LessonContentType } from "@/types/domain";

const TYPES: { type: LessonContentType; label: string; icon: typeof Film; hint: string }[] = [
  { type: "video", label: "Video", icon: Film, hint: "Pick from the library" },
  { type: "text", label: "Text", icon: AlignLeft, hint: "Write it here" },
  { type: "file", label: "File", icon: FileText, hint: "PDF or document" },
  { type: "link", label: "Link", icon: Link2, hint: "External resource" },
  { type: "scorm", label: "SCORM", icon: Package, hint: "Upload a .zip package" },
];

export function AddLessonDialog({
  courseId,
  moduleId,
  onClose,
  onCreated,
}: {
  courseId: string;
  /** Non-null opens the dialog for that module. */
  moduleId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<LessonContentType>("video");
  const [title, setTitle] = useState("");
  const [pickingAsset, setPickingAsset] = useState(false);

  const create = useMutation({
    mutationFn: (assetId?: string) =>
      coursesApi.createLesson({
        courseId,
        moduleId: moduleId!,
        title,
        contentType: type,
        assetId,
        body: type === "text" ? "" : undefined,
        url: type === "link" ? "" : undefined,
      }),
    onSuccess: (lesson) => {
      onCreated();
      onClose();
      // Text and link lessons have nothing yet — go straight to the editor.
      if (type === "text" || type === "link") {
        router.push(`/manage/courses/${courseId}/lessons/${lesson.id}`);
      }
      // SCORM upload/processing isn't wired to the real backend yet (see
      // SCORM/xAPI module — still mock-only this pass), so the simulated
      // "Processing..." → "ready" transition the mock had is dropped rather
      // than silently no-op-ing against a field the backend doesn't accept.
    },
  });

  const needsAsset = type === "video" || type === "file" || type === "scorm";

  return (
    <Dialog open={!!moduleId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={pickingAsset ? "max-w-3xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{pickingAsset ? "Choose content" : "Add lesson"}</DialogTitle>
        </DialogHeader>

        {pickingAsset ? (
          <>
            <ContentLibrary
              mode="picker"
              onUseSelected={(asset) => create.mutate(asset.id)}
            />
            <DialogFooter>
              <Button variant="secondary" onClick={() => setPickingAsset(false)}>
                Back
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {TYPES.map(({ type: t, label, icon: Icon, hint }) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring " +
                    (type === t
                      ? "border-accent bg-accent-soft"
                      : "border-border hover:border-border-strong")
                  }
                >
                  <Icon className="size-4 text-text-secondary" />
                  <span className="text-sm font-semibold text-text-primary">{label}</span>
                  <span className="text-[11px] text-text-tertiary">{hint}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lesson-title">Lesson name</Label>
              <Input
                id="lesson-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The discovery call"
              />
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={!title.trim()}
                loading={create.isPending}
                onClick={() => (needsAsset ? setPickingAsset(true) : create.mutate(undefined))}
              >
                {needsAsset ? "Choose content" : "Create"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
