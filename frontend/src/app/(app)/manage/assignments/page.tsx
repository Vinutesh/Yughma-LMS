"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ContentLibrary } from "@/components/content/ContentLibrary";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as assignmentsApi from "@/lib/api/resources/assignments";
import * as coursesApi from "@/lib/api/resources/courses";
import { ApiError } from "@/lib/api/errors";
import type { SubmissionType } from "@/types/domain";

export default function ManageAssignmentsPage() {
  // The backend authorizes every assignment mutation via `courses:edit`
  // (see `assignments.ts`'s `requirePermission("courses", "edit")` and
  // `hasEditPermission`), not a separate "assignments" permission — this
  // must check the same resource the server actually enforces, or the page
  // is unreachable for the only people who really can use it.
  const canEdit = usePermission("courses", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [attachFileFor, setAttachFileFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments", session?.org.id],
    queryFn: () => assignmentsApi.listAssignments(),
    enabled: !!session && canEdit,
  });

  const remove = useMutation({
    mutationFn: (id: string) => assignmentsApi.deleteAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  /** Marking one assignment qualifying for a course automatically unmarks
   * whichever one held that spot before (enforced server-side) — refetch
   * the whole list rather than patch just this row, so that demotion shows
   * up too. */
  const toggleQualifying = useMutation({
    mutationFn: ({ id, isQualifying }: { id: string; isQualifying: boolean }) =>
      assignmentsApi.updateAssignment(id, { isQualifying }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  const attachFile = useMutation({
    mutationFn: ({ id, assetId }: { id: string; assetId: string }) =>
      assignmentsApi.updateAssignment(id, { assetId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      setAttachFileFor(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  if (!canEdit) return <AccessDenied title="Assignments" />;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Assignments</h1>
        <Button onClick={() => setCreateOpen(true)}>Create assignment</Button>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          description="Create one against a course and learners will see it in their list."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Name</TableTh>
              <TableTh>Course</TableTh>
              <TableTh>Due</TableTh>
              <TableTh>Ungraded</TableTh>
              <TableTh>Certificate</TableTh>
              <TableTh className="w-10" />
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableTd>
                  <Link
                    href={`/manage/assignments/${a.id}`}
                    className="font-medium text-text-primary hover:text-accent hover:underline"
                  >
                    {a.title}
                  </Link>
                  {a.assetId && (
                    <Paperclip
                      className="ml-1.5 inline size-3 text-text-tertiary"
                      aria-label="Has an attached file"
                    />
                  )}
                </TableTd>
                <TableTd className="text-xs">{a.courseTitle}</TableTd>
                <TableTd className="text-xs">
                  {a.dueAt
                    ? new Date(a.dueAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </TableTd>
                <TableTd>
                  {a.ungradedCount > 0 ? (
                    <Badge variant="warning">{a.ungradedCount}</Badge>
                  ) : (
                    <span className="text-xs text-text-tertiary">0</span>
                  )}
                </TableTd>
                <TableTd>
                  {a.isQualifying ? (
                    <Badge variant="success">Qualifying · {a.passingScorePercent}% to pass</Badge>
                  ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                  )}
                </TableTd>
                <TableTd>
                  <Menu>
                    <MenuTrigger label={`Actions for ${a.title}`} />
                    <MenuContent>
                      <MenuItem
                        onSelect={() => {
                          setError(null);
                          setAttachFileFor(a.id);
                        }}
                      >
                        {a.assetId ? "Replace assignment file" : "Attach assignment file"}
                      </MenuItem>
                      <MenuItem
                        onSelect={() => {
                          setError(null);
                          toggleQualifying.mutate({ id: a.id, isQualifying: !a.isQualifying });
                        }}
                      >
                        {a.isQualifying ? "Unmark as qualifying assignment" : "Mark as qualifying assignment"}
                      </MenuItem>
                      <MenuItem
                        destructive
                        onSelect={() => {
                          setError(null);
                          remove.mutate(a.id);
                        }}
                      >
                        Delete
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateAssignmentDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog open={!!attachFileFor} onOpenChange={(v) => !v && setAttachFileFor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upload the assignment file</DialogTitle>
          </DialogHeader>
          <ContentLibrary
            mode="picker"
            onUseSelected={(asset) => attachFileFor && attachFile.mutate({ id: attachFileFor, assetId: asset.id })}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAttachFileFor(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateAssignmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const session = useSessionStore((s) => s.session)!;
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [submissionType, setSubmissionType] = useState<SubmissionType>("text");
  const [points, setPoints] = useState("20");
  const [isQualifying, setIsQualifying] = useState(false);
  const [passingScorePercent, setPassingScorePercent] = useState("80");
  const [assetId, setAssetId] = useState<string | undefined>(undefined);
  const [assetName, setAssetName] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", session.org.id],
    queryFn: () => coursesApi.listCourses(),
  });

  const create = useMutation({
    mutationFn: () =>
      assignmentsApi.createAssignment({
        courseId,
        title,
        instructions,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        submissionType,
        pointsPossible: Number(points),
        isQualifying,
        passingScorePercent: Number(passingScorePercent),
        assetId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      onOpenChange(false);
      setTitle("");
      setInstructions("");
      setDueAt("");
      setIsQualifying(false);
      setPassingScorePercent("80");
      setAssetId(undefined);
      setAssetName(undefined);
      setError(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  if (pickerOpen) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upload the assignment file</DialogTitle>
          </DialogHeader>
          <ContentLibrary
            mode="picker"
            onUseSelected={(asset) => {
              setAssetId(asset.id);
              setAssetName(asset.name);
              setPickerOpen(false);
            }}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create assignment</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {error && (
            <p className="rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-title">Name</Label>
            <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-course">Course</Label>
            <select
              id="a-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
            >
              <option value="">Select a course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-instructions">Instructions</Label>
            <textarea
              id="a-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Assignment file (optional)</Label>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm text-text-secondary">
                {assetName ?? "Nothing attached — text instructions only"}
              </span>
              <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                {assetName ? "Change" : "Upload"}
              </Button>
            </div>
            <p className="text-xs text-text-tertiary">
              The test/document learners work from — uploaded here, not by the learner.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-due">Due date</Label>
              <Input
                id="a-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-type">Submission</Label>
              <select
                id="a-type"
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value as SubmissionType)}
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
              >
                <option value="text">Text only</option>
                <option value="file">File only</option>
                <option value="both">Text + file</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-points">Points</Label>
              <Input
                id="a-points"
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={isQualifying}
                onChange={(e) => setIsQualifying(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Qualifying assignment for this course&apos;s certificate
            </label>
            <p className="text-xs text-text-tertiary">
              If the course has a certificate, it won&apos;t be issued until this assignment is
              graded at or above the passing score below — even if every lesson is complete. Only
              one qualifying assignment is allowed per course.
            </p>
            {isQualifying && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="a-passing">Passing score (%)</Label>
                <Input
                  id="a-passing"
                  type="number"
                  min={1}
                  max={100}
                  className="w-24"
                  value={passingScorePercent}
                  onChange={(e) => setPassingScorePercent(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || !courseId}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
