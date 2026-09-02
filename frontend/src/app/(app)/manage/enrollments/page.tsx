"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import * as coursesApi from "@/lib/api/resources/courses";
import * as platformApi from "@/lib/api/resources/platform";

/**
 * Platform-admin-only: who has access to which course. Access is a whole-
 * course grant a platform admin creates directly, never a learner-initiated
 * request — see `platform.ts` router's doc comment.
 */
export default function CourseAccessPage() {
  const session = useSessionStore((s) => s.session);
  const isPlatform = session?.org.isPlatform ?? false;
  const [courseId, setCourseId] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const qc = useQueryClient();

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", session?.org.id],
    queryFn: () => coursesApi.listCourses(),
    enabled: isPlatform,
  });

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ["courseGrants", courseId],
    queryFn: () => platformApi.listCourseGrants(courseId),
    enabled: isPlatform && !!courseId,
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => platformApi.revokeCourseAccess(userId, courseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courseGrants", courseId] }),
  });

  if (!isPlatform) return <AccessDenied title="Course Access" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Course Access</h1>
        {courseId && <Button onClick={() => setGrantOpen(true)}>Grant access</Button>}
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        Access is a whole-course grant — pick a course, then choose who at a client company can see it.
      </p>

      <select
        aria-label="Course"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="mb-4 h-9 w-full max-w-sm rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
      >
        <option value="">Select a course...</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>

      {!courseId ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Pick a course</p>
          <p className="text-xs text-text-tertiary">Its access list shows up here.</p>
        </Card>
      ) : isLoading ? (
        <p className="text-sm text-text-tertiary">Loading access list...</p>
      ) : grants.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">No one has access yet</p>
          <p className="text-xs text-text-tertiary">Grant access to a person at a client company.</p>
        </Card>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Person</TableTh>
              <TableTh>Company</TableTh>
              <TableTh>Status</TableTh>
              <TableTh className="w-24" />
            </TableRow>
          </TableHead>
          <TableBody>
            {grants.map((g) => (
              <TableRow key={g.enrollmentId}>
                <TableTd className="font-medium text-text-primary">
                  {g.userName}
                  <div className="text-xs font-normal text-text-tertiary">{g.userEmail}</div>
                </TableTd>
                <TableTd>{g.orgName}</TableTd>
                <TableTd>
                  <Badge variant={g.status === "completed" ? "success" : "neutral"}>{g.status}</Badge>
                </TableTd>
                <TableTd>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={revoke.isPending && revoke.variables === g.userId}
                    onClick={() => revoke.mutate(g.userId)}
                  >
                    Revoke
                  </Button>
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <GrantAccessDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        courseId={courseId}
        onDone={() => qc.invalidateQueries({ queryKey: ["courseGrants", courseId] })}
      />
    </div>
  );
}

function GrantAccessDialog({
  open,
  onOpenChange,
  courseId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  onDone: () => void;
}) {
  const [orgId, setOrgId] = useState("");
  const [userId, setUserId] = useState("");

  const { data: orgs = [] } = useQuery({
    queryKey: ["clientOrgs"],
    queryFn: () => platformApi.listClientOrgs(),
    enabled: open,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["clientUsers", orgId],
    queryFn: () => platformApi.listClientUsers(orgId),
    enabled: open && !!orgId,
  });

  const mutation = useMutation({
    mutationFn: () => platformApi.grantCourseAccess(userId, courseId),
    onSuccess: () => {
      onDone();
      onOpenChange(false);
      setOrgId("");
      setUserId("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant access</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Company</label>
            <select
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                setUserId("");
              }}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            >
              <option value="">Select a company...</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Person</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={!orgId}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm disabled:opacity-50"
            >
              <option value="">Select a person...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!userId} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Grant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
