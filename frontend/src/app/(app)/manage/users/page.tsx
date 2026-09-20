"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/Drawer";
import { useSessionStore } from "@/state/sessionStore";
import { usePermission } from "@/hooks/usePermission";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import * as usersApi from "@/lib/api/resources/users";
import * as orgsApi from "@/lib/api/resources/organizations";
import * as rolesApi from "@/lib/api/resources/roles";
import { ApiError } from "@/lib/api/errors";
import type { Role, User } from "@/types/domain";

export default function UsersPage() {
  const canView = usePermission("users", "view");
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();

  const [tab, setTab] = useState<"active" | "deactivated">("active");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users", org?.id],
    queryFn: () => usersApi.listUsers(),
    enabled: !!org,
  });
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: rolesApi.listRoles });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", org?.id],
    queryFn: () => orgsApi.listDepartments(),
    enabled: !!org,
  });

  const roleName = (u: User) =>
    roles.find((r) => u.roleIds.includes(r.id) && r.name !== "Learner")?.name ?? "Learner";
  const deptTeamLabel = (u: User) => {
    const dept = departments.find((d) => d.id === u.departmentId);
    const team = dept?.teams.find((t) => t.id === u.teamId);
    return team ? team.name : (dept?.name ?? "—");
  };

  const filtered = useMemo(
    () =>
      users
        .filter((u) => u.status === tab)
        .filter(
          (u) =>
            !search ||
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()),
        ),
    [users, tab, search],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users", org?.id] });

  if (!canView) return <AccessDenied title="Users" />;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Users</h1>
        <Button onClick={() => setInviteOpen(true)}>Invite people</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "deactivated")}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="deactivated">Deactivated</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="my-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-72"
        />
      </div>

      <Table>
        <TableHead>
          <tr>
            <TableTh>Name</TableTh>
            <TableTh>Email</TableTh>
            <TableTh>Department</TableTh>
            <TableTh>Role</TableTh>
          </tr>
        </TableHead>
        <TableBody>
          {filtered.map((u) => (
            <TableRow key={u.id} className="cursor-pointer" onClick={() => setSelectedUser(u)}>
              <TableTd className="font-medium text-text-primary">{u.name}</TableTd>
              <TableTd>{u.email}</TableTd>
              <TableTd>{deptTeamLabel(u)}</TableTd>
              <TableTd>
                <Badge variant={roleName(u) === "Org Admin" ? "accent" : "neutral"}>{roleName(u)}</Badge>
              </TableTd>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <tr>
              <TableTd colSpan={4} className="py-8 text-center text-text-tertiary">
                No {tab} users found.
              </TableTd>
            </tr>
          )}
        </TableBody>
      </Table>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} roles={roles} onDone={invalidate} />

      <Drawer open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DrawerContent>
          {selectedUser && (
            <UserDetail
              user={selectedUser}
              roles={roles}
              departments={departments}
              onFieldChanged={invalidate}
              onStatusChanged={() => {
                invalidate();
                setSelectedUser(null);
              }}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  roles,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: Role[];
  onDone: () => void;
}) {
  /** `roleId: ""` means "no manage-mode role" — i.e. a plain Learner, which
   * every account is implicitly. Deliberately not keyed off a role *named*
   * "Learner": the platform org doesn't have one (its roles are Admin and
   * Platform Admin), and requiring one is what used to make this dialog
   * silently refuse to add anybody there at all. */
  type InviteRow = { email: string; name: string; roleId: string };
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<usersApi.InviteResult[] | null>(null);
  const assignableRoles = roles.filter((r) => r.name !== "Learner");

  const mutation = useMutation({
    mutationFn: (list: InviteRow[]) =>
      usersApi.inviteUsers(
        list.map((r) => ({
          name: r.name.trim() || r.email.split("@")[0],
          email: r.email,
          roleId: r.roleId || null,
        })),
      ),
    onSuccess: (res) => {
      setResults(res);
      onDone();
    },
  });

  /** A display name is required on the account, so seed it from the email's
   * local part ("manish.naik@..." → "Manish Naik") and leave it editable
   * rather than silently inventing one that can't be corrected. */
  function nameFromEmail(email: string): string {
    return email
      .split("@")[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  /** The typed-but-not-yet-committed email, as a row — or null if it isn't
   * a usable address. Kept separate from `rows` so "type an address, click
   * Send" works: the button used to be disabled until the text had been
   * turned into a row by Enter/blur, and a disabled button never receives
   * the click that would have blurred the input, so that combination just
   * did nothing at all. */
  function draftRow(): InviteRow | null {
    const v = draft.trim().toLowerCase();
    if (!v || !v.includes("@") || rows.some((r) => r.email === v)) return null;
    return { email: v, name: nameFromEmail(v), roleId: "" };
  }

  function addDraft() {
    const row = draftRow();
    if (!row) return;
    setRows([...rows, row]);
    setDraft("");
  }

  function reset() {
    setRows([]);
    setDraft("");
    setResults(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5 rounded-md border border-border p-2.5">
          {rows.map((r) => {
            const result = results?.find((x) => x.email === r.email);
            return (
              <div key={r.email} className="flex flex-col gap-1 border-b border-border pb-1.5 last:border-0">
                <div className="flex items-center gap-2 text-sm">
                  <input
                    value={r.name}
                    onChange={(e) =>
                      setRows(rows.map((x) => (x.email === r.email ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder="Name"
                    aria-label={`Name for ${r.email}`}
                    className="w-32 rounded border border-border bg-surface px-1.5 py-1 text-xs"
                  />
                  <span className="flex-1 truncate text-text-secondary">{r.email}</span>
                  <select
                    value={r.roleId}
                    aria-label={`Role for ${r.email}`}
                    onChange={(e) =>
                      setRows(rows.map((x) => (x.email === r.email ? { ...x, roleId: e.target.value } : x)))
                    }
                    className="rounded border border-border bg-surface px-1.5 py-1 text-xs"
                  >
                    <option value="">Learner</option>
                    {assignableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="text-text-tertiary hover:text-danger"
                    onClick={() => setRows(rows.filter((x) => x.email !== r.email))}
                  >
                    ✕
                  </button>
                </div>
                {result?.status === "failed" && (
                  <p className="text-[11px] font-medium text-danger">{result.message}</p>
                )}
                {result?.status === "invited" && (
                  <p className={`text-[11px] ${result.emailSent ? "text-success" : "text-warning"}`}>
                    {result.emailSent
                      ? "Account created — welcome email sent. Temporary password: "
                      : "Account created, but the email couldn't be sent — send them this password yourself: "}
                    <span className="font-mono font-semibold text-text-secondary">{result.tempPassword}</span>
                  </p>
                )}
              </div>
            );
          })}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addDraft();
              }
            }}
            onBlur={addDraft}
            aria-label="Email address to invite"
            placeholder={rows.length === 0 ? "name@company.com" : "Add another email..."}
            className="rounded px-1.5 py-1.5 text-sm outline-none placeholder:text-text-tertiary"
          />
        </div>
        <p className="text-xs text-text-tertiary">
          Each person gets a welcome email with a temporary password they&apos;re required to change
          on first login. The password also shows here once sent, in case the email doesn&apos;t
          reach them.
        </p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {results ? "Done" : "Cancel"}
          </Button>
          <Button
            disabled={rows.length === 0 && !draftRow()}
            loading={mutation.isPending}
            onClick={() => {
              // Commit whatever is still sitting in the input first, and
              // send that same list rather than reading `rows` back —
              // `setRows` won't have applied yet in this handler.
              const pending = draftRow();
              const list = pending ? [...rows, pending] : rows;
              if (pending) {
                setRows(list);
                setDraft("");
              }
              mutation.mutate(list);
            }}
          >
            {results ? "Send again" : "Send invites"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDetail({
  user,
  roles,
  departments,
  onFieldChanged,
  onStatusChanged,
}: {
  user: User;
  roles: Role[];
  departments: orgsApi.DepartmentWithTeams[];
  onFieldChanged: () => void;
  onStatusChanged: () => void;
}) {
  const currentRole = roles.find((r) => user.roleIds.includes(r.id) && r.name !== "Learner");
  const [roleId, setRoleId] = useState(currentRole?.id ?? "");
  const [deptId, setDeptId] = useState(user.departmentId ?? "");
  const [teamId, setTeamId] = useState(user.teamId ?? "");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const roleMutation = useMutation({
    mutationFn: (newRoleId: string) => usersApi.updateUserRole(user.id, newRoleId || null),
    onSuccess: onFieldChanged,
  });
  const assignMutation = useMutation({
    mutationFn: (vars: { deptId: string; teamId: string }) =>
      usersApi.updateUserAssignment(user.id, vars.deptId || undefined, vars.teamId || undefined),
    onSuccess: onFieldChanged,
  });
  /** Deliberately not auto-dismissed: the temp password is shown exactly
   * once and there's no way to retrieve it afterwards, so it stays on
   * screen until the drawer closes. */
  const resetPassword = useMutation({
    mutationFn: () => usersApi.resetUserPassword(user.id),
  });
  const statusMutation = useMutation({
    mutationFn: () =>
      user.status === "active" ? usersApi.deactivateUser(user.id) : usersApi.reactivateUser(user.id),
    onSuccess: onStatusChanged,
    onError: (err) => {
      if (err instanceof ApiError) setBlockedMessage(err.message);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteUser(user.id),
    onSuccess: () => {
      setConfirmDelete(false);
      onStatusChanged();
    },
    onError: (err) => {
      setConfirmDelete(false);
      if (err instanceof ApiError) setBlockedMessage(err.message);
    },
  });

  const selectedDept = departments.find((d) => d.id === deptId);

  return (
    <>
      <DrawerTitle>{user.name}</DrawerTitle>
      <DrawerDescription>{user.email}</DrawerDescription>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Role</label>
          <select
            aria-label="Role"
            value={roleId}
            onChange={(e) => {
              setRoleId(e.target.value);
              roleMutation.mutate(e.target.value);
            }}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
          >
            {roles
              .filter((r) => r.name !== "Learner")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            <option value="">Learner (no manage access)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Department</label>
          <select
            aria-label="Department"
            value={deptId}
            onChange={(e) => {
              const nextDept = e.target.value;
              setDeptId(nextDept);
              setTeamId("");
              assignMutation.mutate({ deptId: nextDept, teamId: "" });
            }}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
          >
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {selectedDept && selectedDept.teams.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Team</label>
            <select
              aria-label="Team"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                assignMutation.mutate({ deptId, teamId: e.target.value });
              }}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            >
              <option value="">—</option>
              {selectedDept.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-tertiary">Status:</span>
          <Badge variant={user.status === "active" ? "success" : "neutral"}>{user.status}</Badge>
        </div>

        {blockedMessage && (
          <p className="rounded-md bg-warning-bg p-2.5 text-xs font-medium text-warning">
            {blockedMessage}
          </p>
        )}

        {resetPassword.data && (
          <p
            className={`rounded-md p-2.5 text-xs ${
              resetPassword.data.emailSent ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
            }`}
          >
            {resetPassword.data.emailSent
              ? "Password reset — an email with the temporary password is on its way. It's also here: "
              : "Password reset, but the email couldn't be sent — pass this along yourself: "}
            <span className="font-mono font-semibold">{resetPassword.data.tempPassword}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" loading={resetPassword.isPending} onClick={() => resetPassword.mutate()}>
            Reset password
          </Button>
          <Button
            variant="secondary"
            loading={statusMutation.isPending}
            onClick={() => statusMutation.mutate()}
          >
            {user.status === "active" ? "Deactivate" : "Reactivate"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setBlockedMessage(null);
              setConfirmDelete(true);
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete {user.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            This removes their account and personal data for good — unlike Deactivate, it can&apos;t
            be undone. Deactivate instead if you only want to block their access.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
