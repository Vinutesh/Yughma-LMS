"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as scormApi from "@/lib/api/resources/scorm";

/** Read-only debug/compliance surface, same permission tier as Audit Log —
 * there is no real LRS behind this yet. */
export default function XapiStatementsPage() {
  const canView = usePermission("roles", "view");
  const session = useSessionStore((s) => s.session);

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ["xapiStatements", session?.org.id],
    queryFn: () => scormApi.listXapiStatements(),
    enabled: !!session && canView,
  });

  if (!canView) return <AccessDenied title="xAPI Statements" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">xAPI Statements</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        Read-only. Derived from lesson-completion activity — there&apos;s no real LRS behind this
        yet (see Settings → LRS Connection).
      </p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading statements...</p>
      ) : statements.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Actor</TableTh>
                <TableTh>Verb</TableTh>
                <TableTh>Object</TableTh>
                <TableTh>Time</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {statements.map((s) => (
                <TableRow key={s.id}>
                  <TableTd>{s.actorName}</TableTd>
                  <TableTd className="text-text-secondary">{s.verb}</TableTd>
                  <TableTd>{s.object}</TableTd>
                  <TableTd className="text-xs text-text-tertiary">
                    {new Date(s.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
