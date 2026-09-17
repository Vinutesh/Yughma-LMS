"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/Drawer";
import { useSessionStore } from "@/state/sessionStore";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import * as platformApi from "@/lib/api/resources/platform";
import type { Organization, Role } from "@/types/domain";

/**
 * Platform-admin-only screen — creating client companies and the people
 * inside them. Only ever rendered for `session.org.isPlatform` accounts (see
 * `nav.ts`'s `platformOnly` gate); the backend enforces this independently
 * via `requirePlatformAdmin`, so this page isn't itself a security boundary.
 */
export default function CompaniesPage() {
  const session = useSessionStore((s) => s.session);
  const isPlatform = session?.org.isPlatform ?? false;
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["clientOrgs"],
    queryFn: () => platformApi.listClientOrgs(),
    enabled: isPlatform,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["clientOrgs"] });

  if (!isPlatform) return <AccessDenied title="Companies" />;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Companies</h1>
        <Button onClick={() => setCreateOpen(true)}>New company</Button>
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        Every client account is created here — companies never sign up on their own.
      </p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading companies...</p>
      ) : orgs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Create the first client company to get started."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Company</TableTh>
              <TableTh>Industry</TableTh>
              <TableTh>Size</TableTh>
              <TableTh>Status</TableTh>
              <TableTh className="w-24" />
            </TableRow>
          </TableHead>
          <TableBody>
            {orgs.map((o) => (
              <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelectedOrg(o)}>
                <TableTd className="font-medium text-text-primary">{o.name}</TableTd>
                <TableTd>{o.industry ?? "—"}</TableTd>
                <TableTd>{o.size ?? "—"}</TableTd>
                <TableTd>
                  <Badge variant={o.status === "active" ? "success" : "neutral"}>
                    {o.status === "active" ? "Active" : "Archived"}
                  </Badge>
                </TableTd>
                <TableTd>
                  <ArchiveToggleButton org={o} onDone={invalidate} />
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateCompanyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onDone={(org) => {
          invalidate();
          setSelectedOrg(org);
        }}
      />

      <Drawer open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <DrawerContent>{selectedOrg && <CompanyDetail org={selectedOrg} />}</DrawerContent>
      </Drawer>
    </div>
  );
}

function ArchiveToggleButton({ org, onDone }: { org: Organization; onDone: () => void }) {
  const active = org.status === "active";
  const mutation = useMutation({
    mutationFn: () =>
      active ? platformApi.archiveClientOrg(org.id) : platformApi.reactivateClientOrg(org.id),
    onSuccess: onDone,
  });

  return (
    <Button
      size="sm"
      variant="ghost"
      loading={mutation.isPending}
      onClick={(e) => {
        e.stopPropagation();
        mutation.mutate();
      }}
    >
      {active ? "Archive" : "Reactivate"}
    </Button>
  );
}

function CreateCompanyDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: (org: Organization) => void;
}) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");

  const mutation = useMutation({
    mutationFn: () => platformApi.createClientOrg({ name: name.trim(), industry: industry.trim() || undefined }),
    onSuccess: ({ org }) => {
      onDone(org);
      onOpenChange(false);
      setName("");
      setIndustry("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New company</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Company name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Industry (optional)</label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Manufacturing" />
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

function CompanyDetail({ org }: { org: Organization }) {
  const qc = useQueryClient();
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [lastTempPassword, setLastTempPassword] = useState<{ email: string; password: string } | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["clientUsers", org.id],
    queryFn: () => platformApi.listClientUsers(org.id),
  });
  const { data: roles = [] } = useQuery({
    queryKey: ["clientOrgRoles", org.id],
    queryFn: () => platformApi.listClientOrgRoles(org.id),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["clientUsers", org.id] });

  return (
    <>
      <DrawerTitle>{org.name}</DrawerTitle>
      <DrawerDescription>{org.industry ?? "No industry set"}</DrawerDescription>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">People</p>
        <Button size="sm" onClick={() => setCreateUserOpen(true)}>
          Add person
        </Button>
      </div>

      {lastTempPassword && (
        <div className="mt-3 rounded-md bg-accent-soft p-2.5 text-xs text-accent-soft-fg">
          <p className="font-semibold">{lastTempPassword.email}</p>
          <p>
            Temporary password: <span className="font-mono">{lastTempPassword.password}</span>
          </p>
          <p className="mt-1 text-[11px] opacity-80">
            Relay this to them directly — it won&apos;t be shown again.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        {users.length === 0 && <p className="text-xs text-text-tertiary">No one added yet.</p>}
        {users.map((u) => (
          <EmployeeRow key={u.id} user={u} onDone={invalidate} />
        ))}
      </div>

      <CreateUserDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        orgId={org.id}
        orgName={org.name}
        roles={roles}
        onDone={(email, tempPassword) => {
          invalidate();
          setLastTempPassword({ email, password: tempPassword });
        }}
      />
    </>
  );
}

function EmployeeRow({ user, onDone }: { user: platformApi.ClientUser; onDone: () => void }) {
  const active = user.status === "active";
  const mutation = useMutation({
    mutationFn: () =>
      active ? platformApi.deactivateClientUser(user.id) : platformApi.reactivateClientUser(user.id),
    onSuccess: onDone,
  });

  return (
    <div className="flex items-center justify-between rounded-md border border-border px-2.5 py-2">
      <div>
        <p className="text-sm font-medium text-text-primary">{user.name}</p>
        <p className="text-xs text-text-tertiary">{user.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={active ? "neutral" : "danger"}>{user.status}</Badge>
        <Button size="sm" variant="ghost" loading={mutation.isPending} onClick={() => mutation.mutate()}>
          {active ? "Deactivate" : "Reactivate"}
        </Button>
      </div>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
  roles,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  orgName: string;
  roles: Role[];
  onDone: (email: string, tempPassword: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");

  const mutation = useMutation({
    mutationFn: () => platformApi.createClientUser({ orgId, name: name.trim(), email: email.trim(), roleId: roleId || null }),
    onSuccess: ({ user, tempPassword }) => {
      onDone(user.email, tempPassword);
      onOpenChange(false);
      setName("");
      setEmail("");
      setRoleId("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add person to {orgName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Role</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            >
              <option value="">Learner (no manage access)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !email.trim()}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
