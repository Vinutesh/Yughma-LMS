"use client";

import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as learnerProfileApi from "@/lib/api/resources/learnerProfile";

function scoreBadgeVariant(score: number): "success" | "warning" | "neutral" {
  if (score >= 50) return "success";
  if (score >= 20) return "warning";
  return "neutral";
}

/**
 * The one visible surface for the CRM & lead-generation capability — what
 * onboarding captured (persona, stated goal) plus a rule-based lead score
 * (see `learnerProfile.ts` router's `computeLeadScore`), so it's
 * demonstrable inside the product rather than only existing as database
 * rows. Same permission tier as Reports/Analytics.
 */
export default function LeadsPage() {
  const canView = usePermission("reports", "view");
  const session = useSessionStore((s) => s.session);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", session?.org.id],
    queryFn: () => learnerProfileApi.listLeads(),
    enabled: !!session && canView,
  });

  if (!canView) return <AccessDenied title="Leads" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Leads</h1>
      <p className="mb-4 text-sm text-text-tertiary">
        What onboarding captured about intent — persona, stated goal, and a rule-based score.
      </p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading leads...</p>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nothing captured yet"
          description="A lead shows up here once someone completes the persona or goal step of onboarding."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Name</TableTh>
                <TableTh>Persona</TableTh>
                <TableTh>Goal</TableTh>
                <TableTh>Score</TableTh>
                <TableTh>Updated</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableTd>
                    <p className="font-medium text-text-primary">{lead.userName}</p>
                    <p className="text-xs text-text-tertiary">{lead.userEmail}</p>
                  </TableTd>
                  <TableTd className="text-text-secondary">{lead.persona ?? "—"}</TableTd>
                  <TableTd className="max-w-xs text-text-secondary">{lead.goal ?? "—"}</TableTd>
                  <TableTd>
                    <Badge variant={scoreBadgeVariant(lead.leadScore)}>{lead.leadScore}</Badge>
                  </TableTd>
                  <TableTd className="text-xs text-text-tertiary">
                    {new Date(lead.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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
