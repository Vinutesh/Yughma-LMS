"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import { SearchInput } from "@/components/patterns/SearchInput";
import { useSessionStore } from "@/state/sessionStore";
import { downloadJson } from "@/lib/utils";
import * as platformApi from "@/lib/api/resources/platform";

/**
 * Platform-admin-only: every employee at every client company in one flat,
 * searchable directory — including who each company's managers/admins are
 * (`roleNames`). The per-company view still exists (Companies page's
 * detail drawer); this is the cross-org one.
 */
export default function AllEmployeesPage() {
  const session = useSessionStore((s) => s.session);
  const isPlatform = session?.org.isPlatform ?? false;
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: allEmployees = [], isLoading } = useQuery({
    queryKey: ["allEmployees"],
    queryFn: () => platformApi.listAllEmployees(),
    enabled: isPlatform,
  });

  const employees = useMemo(() => {
    const q = search.toLowerCase();
    return allEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.orgName.toLowerCase().includes(q) ||
        e.roleNames.some((r) => r.toLowerCase().includes(q)),
    );
  }, [allEmployees, search]);

  const toggleStatus = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      active ? platformApi.deactivateClientUser(userId) : platformApi.reactivateClientUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allEmployees"] }),
  });

  const exportData = useMutation({
    mutationFn: (userId: string) => platformApi.exportUserData(userId),
    onSuccess: (data, userId) => {
      const person = allEmployees.find((e) => e.id === userId);
      downloadJson(`${person?.name ?? userId}-data-export.json`, data);
    },
  });

  const [eraseTarget, setEraseTarget] = useState<{ id: string; name: string } | null>(null);
  const eraseUser = useMutation({
    mutationFn: (userId: string) => platformApi.eraseClientUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEmployees"] });
      setEraseTarget(null);
    },
  });

  if (!isPlatform) return <AccessDenied title="All Employees" />;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">All Employees</h1>
      <p className="mb-4 text-sm text-text-tertiary">
        Every person across every client company, including managers and org admins.
      </p>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, company, or role..."
        aria-label="Search employees"
        className="mb-4 max-w-96"
      />

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading employees...</p>
      ) : allEmployees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="They'll show up here once companies have people added."
        />
      ) : employees.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Person</TableTh>
                <TableTh>Company</TableTh>
                <TableTh>Role</TableTh>
                <TableTh>Status</TableTh>
                <TableTh className="w-72" />
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((e) => {
                const active = e.status === "active";
                return (
                  <TableRow key={e.id}>
                    <TableTd className="font-medium text-text-primary">
                      {e.name}
                      <div className="text-xs font-normal text-text-tertiary">{e.email}</div>
                    </TableTd>
                    <TableTd>
                      {e.orgName}
                      {e.orgStatus === "archived" && (
                        <Badge className="ml-2" variant="neutral">
                          Company archived
                        </Badge>
                      )}
                    </TableTd>
                    <TableTd>{e.roleNames.length > 0 ? e.roleNames.join(", ") : "Learner"}</TableTd>
                    <TableTd>
                      <Badge variant={active ? "success" : "neutral"}>{active ? "Active" : "Deactivated"}</Badge>
                    </TableTd>
                    <TableTd>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={exportData.isPending && exportData.variables === e.id}
                          onClick={() => exportData.mutate(e.id)}
                        >
                          Export data
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={toggleStatus.isPending && toggleStatus.variables?.userId === e.id}
                          onClick={() => toggleStatus.mutate({ userId: e.id, active })}
                        >
                          {active ? "Deactivate" : "Reactivate"}
                        </Button>
                        {!active && (
                          <Button size="sm" variant="ghost" className="text-danger" onClick={() => setEraseTarget({ id: e.id, name: e.name })}>
                            Erase
                          </Button>
                        )}
                      </div>
                    </TableTd>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!eraseTarget} onOpenChange={(v) => !v && setEraseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently erase {eraseTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            This permanently deletes their account and personal data (enrollments, certificates,
            submissions, notifications) — unlike Deactivate, this cannot be undone. Use this only
            to fulfill a data-erasure request.
          </p>
          {eraseUser.isError && (
            <p className="text-sm text-danger">{(eraseUser.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEraseTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={eraseUser.isPending}
              onClick={() => eraseTarget && eraseUser.mutate(eraseTarget.id)}
            >
              Permanently erase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
