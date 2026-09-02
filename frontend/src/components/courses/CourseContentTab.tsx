"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, FileText, Film, Link2, AlignLeft, Package } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import * as coursesApi from "@/lib/api/resources/courses";
import type { CourseDetail } from "@/lib/api/resources/courses";
import type { LessonContentType } from "@/types/domain";
import { AddLessonDialog } from "./AddLessonDialog";

const TYPE_ICON: Record<LessonContentType, typeof FileText> = {
  video: Film,
  file: FileText,
  text: AlignLeft,
  link: Link2,
  scorm: Package,
};

const TYPE_LABEL: Record<LessonContentType, string> = {
  video: "Video",
  file: "File",
  text: "Text",
  link: "Link",
  scorm: "SCORM",
};

export function CourseContentTab({ course }: { course: CourseDetail }) {
  const qc = useQueryClient();
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [addLessonFor, setAddLessonFor] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["course", course.id] });

  const addModule = useMutation({
    mutationFn: () => coursesApi.createModule(course.id, moduleTitle),
    onSuccess: () => {
      setAddModuleOpen(false);
      setModuleTitle("");
      invalidate();
    },
  });

  const renameModule = useMutation({
    mutationFn: () => coursesApi.renameModule(course.id, renaming!.id, renaming!.title),
    onSuccess: () => {
      setRenaming(null);
      invalidate();
    },
  });

  const deleteModule = useMutation({
    mutationFn: (moduleId: string) => coursesApi.deleteModule(course.id, moduleId),
    onSuccess: invalidate,
  });

  const deleteLesson = useMutation({
    mutationFn: (lessonId: string) => coursesApi.deleteLesson(course.id, lessonId),
    onSuccess: invalidate,
  });

  const moveLesson = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) =>
      coursesApi.moveLesson(course.id, id, direction),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-3">
      {course.outline.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">No modules yet</p>
          <p className="text-xs text-text-tertiary">
            Modules group lessons. Add one to start building the syllabus.
          </p>
        </Card>
      )}

      {course.outline.map((mod) => (
        <Card key={mod.id} className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">{mod.title}</p>
            <Menu>
              <MenuTrigger label={`Actions for ${mod.title}`} />
              <MenuContent>
                <MenuItem onSelect={() => setRenaming({ id: mod.id, title: mod.title })}>
                  Rename
                </MenuItem>
                <MenuSeparator />
                <MenuItem destructive onSelect={() => deleteModule.mutate(mod.id)}>
                  Delete module
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>

          {mod.lessons.length > 0 && (
            <ul className="mt-2 flex flex-col divide-y divide-border border-t border-border">
              {mod.lessons.map((lesson, i) => {
                const Icon = TYPE_ICON[lesson.contentType];
                return (
                  <li key={lesson.id} className="flex items-center gap-2 py-2">
                    <Icon className="size-4 shrink-0 text-text-tertiary" />
                    <Link
                      href={`/manage/courses/${course.id}/lessons/${lesson.id}`}
                      className="flex-1 truncate text-sm text-text-secondary hover:text-accent hover:underline"
                    >
                      {lesson.title}
                    </Link>
                    <span className="text-[11px] text-text-tertiary">
                      {TYPE_LABEL[lesson.contentType]}
                    </span>
                    <button
                      aria-label={`Move ${lesson.title} up`}
                      disabled={i === 0}
                      onClick={() => moveLesson.mutate({ id: lesson.id, direction: "up" })}
                      className="rounded p-1 text-text-tertiary hover:bg-surface-alt hover:text-text-primary disabled:opacity-30"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      aria-label={`Move ${lesson.title} down`}
                      disabled={i === mod.lessons.length - 1}
                      onClick={() => moveLesson.mutate({ id: lesson.id, direction: "down" })}
                      className="rounded p-1 text-text-tertiary hover:bg-surface-alt hover:text-text-primary disabled:opacity-30"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                    <Menu>
                      <MenuTrigger label={`Actions for ${lesson.title}`} />
                      <MenuContent>
                        <MenuItem destructive onSelect={() => deleteLesson.mutate(lesson.id)}>
                          Delete lesson
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  </li>
                );
              })}
            </ul>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => setAddLessonFor(mod.id)}
          >
            + Add lesson
          </Button>
        </Card>
      ))}

      <div>
        <Button size="sm" variant="secondary" onClick={() => setAddModuleOpen(true)}>
          + Add module
        </Button>
      </div>

      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add module</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-title">Title</Label>
            <Input
              id="module-title"
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="e.g. Objection Handling"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddModuleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!moduleTitle.trim()}
              loading={addModule.isPending}
              onClick={() => addModule.mutate()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename module</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rename-module">Title</Label>
            <Input
              id="rename-module"
              value={renaming?.title ?? ""}
              onChange={(e) => setRenaming((r) => (r ? { ...r, title: e.target.value } : r))}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renaming?.title.trim()}
              loading={renameModule.isPending}
              onClick={() => renameModule.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyed so each open starts from a clean type/title rather than the
          previous module's half-filled form. */}
      <AddLessonDialog
        key={addLessonFor ?? "none"}
        courseId={course.id}
        moduleId={addLessonFor}
        onClose={() => setAddLessonFor(null)}
        onCreated={invalidate}
      />
    </div>
  );
}
