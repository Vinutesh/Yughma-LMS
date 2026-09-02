"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import * as rolesApi from "@/lib/api/resources/roles";
import * as usersApi from "@/lib/api/resources/users";
import { ApiError } from "@/lib/api/errors";
import { RESOURCES } from "@/config/permissions";
import type { Permission, Role } from "@/types/domain";

const RESOURCE_LABELS: Record<string, string> = {
  [RESOURCES.courses]: "Courses",
  [RESOURCES.assignments]: "Assignments",
  [RESOURCES.reports]: "Reports",
  [RESOURCES.team]: "Team",
  [RESOURCES.users]: "Users",
  [RESOURCES.roles]: "Roles",
  [RESOURCES.settings]: "Settings",
};
const ACTIONS: Permission["action"][] = ["view", "edit", "manage"];

export default function RolesPage() {
  const canView = usePermission("roles", "view");
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);

  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: rolesApi.listRoles });
  const { data: users = [] } = useQuery({
    queryKey: ["allUsers", org?.id],
    queryFn: () => usersApi.listUsers(),
    enabled: !!org,
  });

  const systemRoles = useMemo(() => roles.filter((r) => r.isSystemRole), [roles]);
  const customRoles = useMemo(() => roles.filter((r) => !r.isSystemRole), [roles]);
  const activeRole = roles.find((r) => r.id === activeRoleId) ?? null;

  const memberCount = (roleId: string) => users.filter((u) => u.roleIds.includes(roleId)).length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["roles"] });
    qc.invalidateQueries({ queryKey: ["allUsers"] });
  };

  if (!canView) return <AccessDenied title="Roles" />;

  if (activeRole) {
    return (
      <PermissionMatrix
        role={activeRole}
        onBack={() => setActiveRoleId(null)}
        onSaved={() => {
          invalidate();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Roles</h1>
        <Button onClick={() => setCreateOpen(true)}>Create role</Button>
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        System roles
      </h2>
      <div className="mb-6 grid grid-cols-4 gap-3">
        {systemRoles.map((r) => (
          <Card
            key={r.id}
            className="cursor-pointer p-3.5 hover:border-border-strong"
            onClick={() => setActiveRoleId(r.id)}
          >
            <p className="text-sm font-semibold text-text-primary">{r.name}</p>
            <p className="text-xs text-text-tertiary">{memberCount(r.id)} people</p>
            <Badge className="mt-2" variant="neutral">
              View only
            </Badge>
          </Card>
        ))}
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        Custom roles
      </h2>
      {customRoles.length === 0 ? (
        <p className="text-sm text-text-tertiary">No custom roles yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {customRoles.map((r) => (
            <Card key={r.id} className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-sm font-semibold text-text-primary">{r.name}</p>
                <p className="text-xs text-text-tertiary">{memberCount(r.id)} people</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setActiveRoleId(r.id)}>
                Edit
              </Button>
            </Card>
          ))}
        </div>
      )}

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        roles={roles}
        onCreated={(role) => {
          invalidate();
          setActiveRoleId(role.id);
        }}
      />
    </div>
  );
}

function CreateRoleDialog({
  open,
  onOpenChange,
  roles,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: Role[];
  onCreated: (role: Role) => void;
}) {
  const [name, setName] = useState("");
  const [cloneFrom, setCloneFrom] = useState(roles[0]?.id ?? "");
  const [blank, setBlank] = useState(false);

  const mutation = useMutation({
    mutationFn: () => rolesApi.createRole(name, blank ? null : cloneFrom),
    onSuccess: (role) => {
      onCreated(role);
      onOpenChange(false);
      setName("");
      setBlank(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={!blank} onChange={() => setBlank(false)} />
              Clone permissions from
              <select
                value={cloneFrom}
                onChange={(e) => setCloneFrom(e.target.value)}
                disabled={blank}
                className="rounded border border-border bg-surface px-2 py-1 text-sm disabled:opacity-50"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={blank} onChange={() => setBlank(true)} />
              Start blank (nothing permitted)
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionMatrix({
  role,
  onBack,
  onSaved,
}: {
  role: Role;
  onBack: () => void;
  onSaved: () => void;
}) {
  const org = useSessionStore((s) => s.session?.org);
  const { data: users = [] } = useQuery({
    queryKey: ["allUsers", org?.id],
    queryFn: () => usersApi.listUsers(),
    enabled: !!org,
  });
  const [permissions, setPermissions] = useState<Permission[]>(role.permissions);
  const [error, setError] = useState<string | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<string | null>(null);

  const editable = !role.isSystemRole;
  const assignedCount = users.filter((u) => u.roleIds.includes(role.id)).length;

  const checked = (resource: string, action: Permission["action"]) =>
    permissions.some((p) => p.resource === resource && p.action === action);

  function toggle(resource: string, action: Permission["action"]) {
    if (!editable) return;
    setPermissions((prev) =>
      checked(resource, action)
        ? prev.filter((p) => !(p.resource === resource && p.action === action))
        : [...prev, { resource, action }],
    );
  }

  const saveMutation = useMutation({
    mutationFn: () => rolesApi.updateRolePermissions(role.id, permissions),
    onSuccess: () => {
      setError(null);
      onSaved();
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => rolesApi.deleteRole(role.id),
    onSuccess: () => {
      onSaved();
      onBack();
    },
    onError: (err) => {
      if (err instanceof ApiError) setDeleteBlocked(err.message);
    },
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <button onClick={onBack} className="mb-3 text-sm font-medium text-accent hover:underline">
        ← Back to Roles
      </button>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">{role.name}</h1>
        {!editable && <Badge variant="neutral">View only</Badge>}
      </div>

      {editable && assignedCount > 0 && (
        <p className="mb-3 rounded-md bg-warning-bg p-2.5 text-xs font-medium text-warning">
          ⚠ Assigned to {assignedCount} {assignedCount === 1 ? "person" : "people"} — changes apply
          immediately.
        </p>
      )}
      {error && <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>}
      {deleteBlocked && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{deleteBlocked}</p>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt">
            <tr>
              <th className="p-3 text-left text-xs font-semibold text-text-tertiary">Resource</th>
              {ACTIONS.map((a) => (
                <th key={a} className="p-3 text-center text-xs font-semibold capitalize text-text-tertiary">
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Object.values(RESOURCES).map((resource) => (
              <tr key={resource}>
                <td className="p-3 text-text-secondary">{RESOURCE_LABELS[resource]}</td>
                {ACTIONS.map((action) => (
                  <td key={action} className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={checked(resource, action)}
                      disabled={!editable}
                      onChange={() => toggle(resource, action)}
                      className="size-4 accent-accent disabled:opacity-40"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editable && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="destructive" onClick={() => deleteMutation.mutate()} loading={deleteMutation.isPending}>
            Delete role
          </Button>
          <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}
