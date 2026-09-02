"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as pathsApi from "@/lib/api/resources/paths";
import * as coursesApi from "@/lib/api/resources/courses";
import * as certificatesApi from "@/lib/api/resources/certificates";
import { ApiError } from "@/lib/api/errors";

export default function PathBuilderPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const canEdit = usePermission("courses", "edit");

  const { data: path, isLoading } = useQuery({
    queryKey: ["path", pathId],
    queryFn: () => pathsApi.getPath(pathId),
    enabled: canEdit,
  });

  if (!canEdit) return <AccessDenied title="Path builder" />;
  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading path...</p>;
  if (!path) return <p className="p-8 text-sm text-text-tertiary">Path not found.</p>;

  return <Builder key={path.id} path={path} />;
}

function Builder({ path }: { path: pathsApi.PathDetail }) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["path", path.id] });
    qc.invalidateQueries({ queryKey: ["paths"] });
  };

  const setCourses = useMutation({
    mutationFn: (courseIds: string[]) => pathsApi.setPathCourses(path.id, courseIds),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  const publish = useMutation({
    mutationFn: () => pathsApi.publishPath(path.id),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  /** Reordering is arrow-based rather than drag-and-drop: a path is a handful of
   * courses, and arrows are keyboard-accessible without extra work. */
  function move(index: number, direction: -1 | 1) {
    const next = [...path.courseIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCourses.mutate(next);
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/manage/paths"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Paths
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{path.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={path.status === "published" ? "success" : "neutral"}>
              {path.status === "published" ? "Published" : "Draft"}
            </Badge>
            <span className="text-xs text-text-tertiary">
              {path.courseCount} {path.courseCount === 1 ? "course" : "courses"}
            </span>
          </div>
        </div>
        {path.status === "draft" && (
          <Button loading={publish.isPending} onClick={() => publish.mutate()}>
            Publish
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <div className="flex flex-col gap-2">
            {path.steps.length === 0 ? (
              <Card className="flex flex-col items-center gap-2 p-8 text-center">
                <p className="text-sm font-semibold text-text-primary">No courses yet</p>
                <p className="text-xs text-text-tertiary">
                  Add published courses in the order learners should take them.
                </p>
              </Card>
            ) : (
              path.steps.map((step, i) => (
                <Card key={step.courseId} className="flex items-center gap-3 p-3.5">
                  <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-text-tertiary">
                    {i + 1}.
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                    {step.title}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      aria-label={`Move ${step.title} up`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      className="rounded p-1 text-text-tertiary hover:bg-surface-alt hover:text-text-primary disabled:opacity-30"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      aria-label={`Move ${step.title} down`}
                      disabled={i === path.steps.length - 1}
                      onClick={() => move(i, 1)}
                      className="rounded p-1 text-text-tertiary hover:bg-surface-alt hover:text-text-primary disabled:opacity-30"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button
                      aria-label={`Remove ${step.title}`}
                      onClick={() =>
                        setCourses.mutate(path.courseIds.filter((id) => id !== step.courseId))
                      }
                      className="rounded p-1 text-text-tertiary hover:text-danger"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </Card>
              ))
            )}

            <div>
              <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                + Add course
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <PathSettings path={path} onSaved={invalidate} />
        </TabsContent>
      </Tabs>

      <CoursePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        alreadyAdded={path.courseIds}
        onAdd={(ids) => {
          setCourses.mutate([...path.courseIds, ...ids]);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function PathSettings({
  path,
  onSaved,
}: {
  path: pathsApi.PathDetail;
  onSaved: () => void;
}) {
  const org = useSessionStore((s) => s.session?.org);
  const [title, setTitle] = useState(path.title);
  const [description, setDescription] = useState(path.description);
  const [certificateTemplateId, setCertificateTemplateId] = useState(
    path.certificateTemplateId ?? "",
  );
  const [saved, setSaved] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["certificateTemplates", org?.id],
    queryFn: () => certificatesApi.listTemplates(),
    enabled: !!org,
  });

  const save = useMutation({
    mutationFn: () =>
      pathsApi.updatePath(path.id, {
        title,
        description,
        certificateTemplateId: certificateTemplateId || undefined,
      }),
    onSuccess: () => {
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-name">Name</Label>
        <Input id="p-name" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-desc">Description</Label>
        <textarea
          id="p-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-cert">Award certificate on completion</Label>
        <select
          id="p-cert"
          value={certificateTemplateId}
          onChange={(e) => setCertificateTemplateId(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
        >
          <option value="">No certificate</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-text-tertiary">
          Issued when the learner finishes every course in the path.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={!title.trim()} loading={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
        {saved && <span className="text-xs font-medium text-success">Saved</span>}
      </div>
    </Card>
  );
}

function CoursePickerDialog({
  open,
  onOpenChange,
  alreadyAdded,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  alreadyAdded: string[];
  onAdd: (ids: string[]) => void;
}) {
  const org = useSessionStore((s) => s.session?.org);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", org?.id],
    queryFn: () => coursesApi.listCourses(),
    enabled: !!org && open,
  });

  // Only published courses: a path containing drafts can't be published anyway,
  // so offering them here would just set up a failure later.
  const candidates = courses.filter(
    (c) =>
      c.status === "published" &&
      !alreadyAdded.includes(c.id) &&
      c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSelected([]);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a course</DialogTitle>
        </DialogHeader>
        <Input
          aria-label="Search published courses"
          placeholder="Search published courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-tertiary">
              No published courses left to add.
            </p>
          ) : (
            candidates.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-surface-alt"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                    )
                  }
                  className="size-4 accent-accent"
                />
                <span className="text-text-secondary">{c.title}</span>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              onAdd(selected);
              setSelected([]);
            }}
          >
            Add selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
