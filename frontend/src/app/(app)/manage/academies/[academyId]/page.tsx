"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as academiesApi from "@/lib/api/resources/academies";
import * as coursesApi from "@/lib/api/resources/courses";
import * as pathsApi from "@/lib/api/resources/paths";
import { ApiError } from "@/lib/api/errors";

export default function AcademyBuilderPage() {
  const { academyId } = useParams<{ academyId: string }>();
  const canEdit = usePermission("courses", "edit");

  const { data: academy, isLoading } = useQuery({
    queryKey: ["academy", academyId],
    queryFn: () => academiesApi.getAcademy(academyId),
    enabled: canEdit,
  });

  if (!canEdit) return <AccessDenied title="Academy builder" />;
  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading academy...</p>;
  if (!academy) return <p className="p-8 text-sm text-text-tertiary">Academy not found.</p>;

  return <Builder key={academy.id} academy={academy} />;
}

function Builder({ academy }: { academy: academiesApi.AcademySummary }) {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [description, setDescription] = useState(academy.description);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", org?.id],
    queryFn: () => coursesApi.listCourses(),
    enabled: !!org,
  });
  const { data: paths = [] } = useQuery({
    queryKey: ["paths", org?.id],
    queryFn: () => pathsApi.listPaths(),
    enabled: !!org,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["academy", academy.id] });
    qc.invalidateQueries({ queryKey: ["academies"] });
  };

  const saveDescription = useMutation({
    mutationFn: () => academiesApi.updateAcademy(academy.id, { description }),
    onSuccess: () => {
      invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const setItems = useMutation({
    mutationFn: (patch: { courseIds?: string[]; pathIds?: string[] }) =>
      academiesApi.updateAcademy(academy.id, patch),
    onSuccess: invalidate,
  });

  const publish = useMutation({
    mutationFn: () => academiesApi.publishAcademy(academy.id),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  const courseItems = academy.courseIds.flatMap((id) => {
    const c = courses.find((c) => c.id === id);
    return c ? [{ id, title: c.title, kind: "course" as const }] : [];
  });
  const pathItems = academy.pathIds.flatMap((id) => {
    const p = paths.find((p) => p.id === id);
    return p ? [{ id, title: p.title, kind: "path" as const }] : [];
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/manage/academies"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Academies
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{academy.title}</h1>
          <Badge className="mt-1" variant={academy.status === "published" ? "success" : "neutral"}>
            {academy.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        {academy.status === "draft" && (
          <Button loading={publish.isPending} onClick={() => publish.mutate()}>
            Publish
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      <Card className="mb-4 flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ac-desc">Description</Label>
          <textarea
            id="ac-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" loading={saveDescription.isPending} onClick={() => saveDescription.mutate()}>
            Save
          </Button>
          {saved && <span className="text-xs font-medium text-success">Saved</span>}
        </div>
      </Card>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        Courses &amp; Paths
      </p>
      <Card className="mb-3 flex flex-col gap-1 p-3">
        {courseItems.length === 0 && pathItems.length === 0 ? (
          <p className="px-1 py-2 text-xs text-text-tertiary">Nothing added yet.</p>
        ) : (
          [...courseItems, ...pathItems].map((item) => (
            <div key={`${item.kind}_${item.id}`} className="flex items-center justify-between px-1 py-1.5 text-sm">
              <span className="text-text-secondary">
                {item.title} {item.kind === "path" && <span className="text-text-tertiary">(path)</span>}
              </span>
              <button
                aria-label={`Remove ${item.title}`}
                onClick={() =>
                  item.kind === "course"
                    ? setItems.mutate({ courseIds: academy.courseIds.filter((id) => id !== item.id) })
                    : setItems.mutate({ pathIds: academy.pathIds.filter((id) => id !== item.id) })
                }
                className="rounded p-0.5 text-text-tertiary hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </Card>
      <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
        + Add...
      </Button>

      <ItemPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        courses={courses.filter((c) => c.status === "published" && !academy.courseIds.includes(c.id))}
        paths={paths.filter((p) => p.status === "published" && !academy.pathIds.includes(p.id))}
        onAdd={(courseIds, pathIds) => {
          setItems.mutate({
            courseIds: [...academy.courseIds, ...courseIds],
            pathIds: [...academy.pathIds, ...pathIds],
          });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function ItemPickerDialog({
  open,
  onOpenChange,
  courses,
  paths,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courses: { id: string; title: string }[];
  paths: { id: string; title: string }[];
  onAdd: (courseIds: string[], pathIds: string[]) => void;
}) {
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSelectedCourses([]);
          setSelectedPaths([]);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add courses &amp; paths</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
          {courses.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Courses</p>
              {courses.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-alt">
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(c.id)}
                    onChange={(e) =>
                      setSelectedCourses((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                      )
                    }
                    className="size-4 accent-accent"
                  />
                  <span className="text-text-secondary">{c.title}</span>
                </label>
              ))}
            </div>
          )}
          {paths.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Paths</p>
              {paths.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-alt">
                  <input
                    type="checkbox"
                    checked={selectedPaths.includes(p.id)}
                    onChange={(e) =>
                      setSelectedPaths((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                      )
                    }
                    className="size-4 accent-accent"
                  />
                  <span className="text-text-secondary">{p.title}</span>
                </label>
              ))}
            </div>
          )}
          {courses.length === 0 && paths.length === 0 && (
            <p className="py-4 text-center text-xs text-text-tertiary">Nothing left to add.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selectedCourses.length === 0 && selectedPaths.length === 0}
            onClick={() => onAdd(selectedCourses, selectedPaths)}
          >
            Add selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
