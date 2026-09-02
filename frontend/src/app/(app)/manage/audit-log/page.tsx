"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/Drawer";
import { ComingSoon } from "@/components/patterns/ComingSoon";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as auditLogApi from "@/lib/api/resources/auditLog";
import * as usersApi from "@/lib/api/resources/users";
import * as reportsApi from "@/lib/api/resources/reports";
import type { AuditActionType } from "@/types/domain";
import type { AuditLogRow } from "@/lib/api/resources/auditLog";

const ACTION_LABELS: Record<AuditActionType, string> = {
  role_changed: "Changed role",
  user_deactivated: "User deactivated",
  user_reactivated: "User reactivated",
  course_archived: "Course archived",
  course_published: "Course published",
  certificate_revoked: "Certificate revoked",
  org_settings_changed: "Org settings changed",
  plan_changed: "Plan changed",
};

/**
 * Org Admin only — a compliance/security surface, same permission tier as
 * Roles & Permissions. Scoped here to `roles:view` rather than a new
 * dedicated permission, per the module's open questions.
 */
export default function AuditLogPage() {
  const canView = usePermission("roles", "view");
  const session = useSessionStore((s) => s.session);
  const [actorUserId, setActorUserId] = useState("");
  const [action, setAction] = useState<AuditActionType | "">("");
  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers", session?.org.id],
    queryFn: () => usersApi.listUsers(),
    enabled: !!session && canView,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["auditLog", session?.org.id, actorUserId, action],
    queryFn: () =>
      auditLogApi.listAuditLog({
        actorUserId: actorUserId || undefined,
        action: action || undefined,
      }),
    enabled: !!session && canView,
  });

  if (!canView) return <ComingSoon title="Audit Log" />;

  function exportCsv() {
    reportsApi.downloadCsv(
      "audit-log.csv",
      reportsApi.toCsv(
        ["Time", "Actor", "Action", "Target"],
        entries.map((e) => [new Date(e.at).toLocaleString(), e.actorName, ACTION_LABELS[e.action], e.targetLabel ?? ""]),
      ),
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Audit Log</h1>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={entries.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <select
          aria-label="Actor"
          value={actorUserId}
          onChange={(e) => setActorUserId(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
        >
          <option value="">All actors</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value as AuditActionType | "")}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading audit log...</p>
      ) : entries.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Nothing recorded yet</p>
          <p className="text-xs text-text-tertiary">
            Actions like role changes and course lifecycle events show up here.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Time</TableTh>
                <TableTh>Actor</TableTh>
                <TableTh>Action</TableTh>
                <TableTh>Target</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="cursor-pointer" onClick={() => setSelected(entry)}>
                  <TableTd className="text-xs text-text-tertiary">
                    {new Date(entry.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </TableTd>
                  <TableTd>{entry.actorName}</TableTd>
                  <TableTd>{ACTION_LABELS[entry.action]}</TableTd>
                  <TableTd className="text-text-secondary">{entry.targetLabel ?? "—"}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <>
              <DrawerTitle>{ACTION_LABELS[selected.action]}</DrawerTitle>
              <div className="mt-3 flex flex-col gap-3 text-sm">
                <p className="text-text-tertiary">
                  {new Date(selected.at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Actor</p>
                  <p className="text-text-primary">{selected.actorName}</p>
                </div>
                {selected.targetLabel && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Target</p>
                    <p className="text-text-primary">{selected.targetLabel}</p>
                  </div>
                )}
                {selected.detail &&
                  Object.entries(selected.detail).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{key}</p>
                      <p className="text-text-primary">{value}</p>
                    </div>
                  ))}
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
