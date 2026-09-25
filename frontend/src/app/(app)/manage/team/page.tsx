"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as dashboardApi from "@/lib/api/resources/dashboard";

/**
 * The full version of the Dashboard's compact "Manager" widget
 * (`manage/dashboard/page.tsx`'s `ManagerSection`) — same data source
 * (`dashboard.manager`, scoped to the caller's own department), but a
 * dedicated page rather than a summary card: every team member listed
 * individually with their own completion number, not just the
 * department-wide average.
 */
export default function TeamOverviewPage() {
  const canView = usePermission("team", "view");
  const session = useSessionStore((s) => s.session);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "manager", session?.org.id, session?.user.id],
    queryFn: () => dashboardApi.getManagerDashboard(),
    enabled: !!session && canView,
  });

  if (!canView) return <AccessDenied title="Team Overview" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Team Overview</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        Everyone in your department, and how they&apos;re tracking against their courses.
      </p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading team...</p>
      ) : !data || data.teamSize === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members assigned yet"
          description="Add people to your department from Users, and they'll show up here."
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {data.teamSize} {data.teamSize === 1 ? "person" : "people"} &middot; overall completion
              </span>
              <span className="font-semibold tabular-nums text-text-primary">{data.completionPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full bg-accent" style={{ width: `${data.completionPercent}%` }} />
            </div>
          </Card>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">People</p>
            <Card className="overflow-hidden">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableTh>Name</TableTh>
                    <TableTh>Enrollments</TableTh>
                    <TableTh>Completion</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.members.map((m) => (
                    <TableRow key={m.id}>
                      <TableTd>
                        <p className="font-medium text-text-primary">{m.name}</p>
                        <p className="text-xs text-text-tertiary">{m.email}</p>
                      </TableTd>
                      <TableTd className="text-text-secondary">{m.enrollmentCount}</TableTd>
                      <TableTd>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-alt">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${m.completionPercent}%` }}
                            />
                          </div>
                          <span className="w-9 text-right text-xs tabular-nums text-text-tertiary">
                            {m.completionPercent}%
                          </span>
                        </div>
                      </TableTd>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {data.overdue.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Overdue</p>
              <Card className="divide-y divide-border">
                {data.overdue.map((row, i) => (
                  <div key={`${row.userId}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 truncate text-text-secondary">
                      {row.learnerName} — {row.courseTitle}
                    </span>
                    <Badge variant="danger">
                      {row.daysOverdue} {row.daysOverdue === 1 ? "day" : "days"}
                    </Badge>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
