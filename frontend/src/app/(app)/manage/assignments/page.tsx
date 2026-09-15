"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as assignmentsApi from "@/lib/api/resources/assignments";
import * as coursesApi from "@/lib/api/resources/courses";
import { ApiError } from "@/lib/api/errors";
import type { SubmissionType } from "@/types/domain";

export default function ManageAssignmentsPage() {
  const canEdit = usePermission("assignments", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
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
                  <Menu>
                    <MenuTrigger label={`Actions for ${a.title}`} />
                    <MenuContent>
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
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      onOpenChange(false);
      setTitle("");
      setInstructions("");
      setDueAt("");
      setError(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

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
