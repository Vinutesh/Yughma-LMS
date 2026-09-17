"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MousePointerClick, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import * as pathsApi from "@/lib/api/resources/paths";
import * as platformApi from "@/lib/api/resources/platform";

/**
 * Platform-admin-only: who has access to which learning path. Same model
 * as Course Access (`manage/enrollments`) — access is a whole-path grant a
 * platform admin creates directly, never learner-initiated.
 */
export default function PathAccessPage() {
  const session = useSessionStore((s) => s.session);
  const isPlatform = session?.org.isPlatform ?? false;
  const [pathId, setPathId] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const qc = useQueryClient();

  const { data: paths = [] } = useQuery({
    queryKey: ["pathCatalog", session?.org.id],
    queryFn: () => pathsApi.listPathCatalog(),
    enabled: isPlatform,
  });

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ["pathGrants", pathId],
    queryFn: () => platformApi.listPathGrants(pathId),
    enabled: isPlatform && !!pathId,
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => platformApi.revokePathAccess(userId, pathId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pathGrants", pathId] }),
  });

  if (!isPlatform) return <AccessDenied title="Path Access" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Path Access</h1>
        {pathId && <Button onClick={() => setGrantOpen(true)}>Grant access</Button>}
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        Access is a whole-path grant — pick a path, then choose who at a client company can see it.
      </p>

      <select
        aria-label="Learning path"
        value={pathId}
        onChange={(e) => setPathId(e.target.value)}
        className="mb-4 h-9 w-full max-w-sm rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
      >
        <option value="">Select a path...</option>
        {paths.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>

      {!pathId ? (
        <EmptyState icon={MousePointerClick} title="Pick a path" description="Its access list shows up here." />
      ) : isLoading ? (
        <p className="text-sm text-text-tertiary">Loading access list...</p>
      ) : grants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No one has access yet"
          description="Grant access to a person at a client company."
        />
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
                <TableTd>{g.completedAt ? "Complete" : "Not complete"}</TableTd>
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
        pathId={pathId}
        onDone={() => qc.invalidateQueries({ queryKey: ["pathGrants", pathId] })}
      />
    </div>
  );
}

function GrantAccessDialog({
  open,
  onOpenChange,
  pathId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pathId: string;
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
    mutationFn: () => platformApi.grantPathAccess(userId, pathId),
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
