"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { ComingSoon } from "@/components/patterns/ComingSoon";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as reportsApi from "@/lib/api/resources/reports";
import * as orgsApi from "@/lib/api/resources/organizations";
import type { ReportDateRange } from "@/lib/api/resources/reports";

type ReportKind = "completion" | "engagement" | "compliance" | "quizScores";

const REPORT_LABELS: Record<ReportKind, string> = {
  completion: "Completion",
  engagement: "Engagement",
  compliance: "Compliance",
  quizScores: "Quiz Scores",
};

const RANGE_LABELS: Record<ReportDateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

export default function ReportsPage() {
  const canView = usePermission("reports", "view");
  const [open, setOpen] = useState<ReportKind | null>(null);

  if (!canView) return <ComingSoon title="Reports" />;
  if (open) return <ReportView kind={open} onBack={() => setOpen(null)} />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-5 text-xl font-semibold text-text-primary">Reports</h1>
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(REPORT_LABELS) as ReportKind[]).map((kind) => (
          <Card
            key={kind}
            className="cursor-pointer p-5 text-center hover:border-border-strong"
            onClick={() => setOpen(kind)}
          >
            <p className="text-sm font-semibold text-text-primary">{REPORT_LABELS[kind]}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportView({ kind, onBack }: { kind: ReportKind; onBack: () => void }) {
  const session = useSessionStore((s) => s.session);
  const [dateRange, setDateRange] = useState<ReportDateRange>("30d");
  const [departmentId, setDepartmentId] = useState("");

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", session?.org.id],
    queryFn: () => orgsApi.listDepartments(),
    enabled: !!session,
  });

  const filters = { dateRange, departmentId: departmentId || undefined };

  const completion = useQuery({
    queryKey: ["report", "completion", session?.org.id, filters],
    queryFn: () => reportsApi.getCompletionReport(filters),
    enabled: !!session && kind === "completion",
  });
  const engagement = useQuery({
    queryKey: ["report", "engagement", session?.org.id, filters],
    queryFn: () => reportsApi.getEngagementReport(filters),
    enabled: !!session && kind === "engagement",
  });
  const compliance = useQuery({
    queryKey: ["report", "compliance", session?.org.id, filters],
    queryFn: () => reportsApi.getComplianceReport(filters),
    enabled: !!session && kind === "compliance",
  });
  const quizScores = useQuery({
    queryKey: ["report", "quizScores", session?.org.id, filters],
    queryFn: () => reportsApi.getQuizScoresReport(filters),
    enabled: !!session && kind === "quizScores",
  });

  const isLoading = completion.isLoading || engagement.isLoading || compliance.isLoading || quizScores.isLoading;

  function exportCsv() {
    if (kind === "completion") {
      const rows = completion.data ?? [];
      reportsApi.downloadCsv(
        "completion-report.csv",
        reportsApi.toCsv(
          ["Person", "Course", "Completed"],
          rows.map((r) => [r.userName, r.courseTitle, new Date(r.completedAt).toLocaleDateString()]),
        ),
      );
    } else if (kind === "engagement") {
      const rows = engagement.data ?? [];
      reportsApi.downloadCsv(
        "engagement-report.csv",
        reportsApi.toCsv(
          ["Person", "Course", "Progress %", "Last activity"],
          rows.map((r) => [r.userName, r.courseTitle, r.progressPercent, new Date(r.lastActivity).toLocaleDateString()]),
        ),
      );
    } else if (kind === "compliance") {
      const rows = compliance.data ?? [];
      reportsApi.downloadCsv(
        "compliance-report.csv",
        reportsApi.toCsv(
          ["Person", "Course", "Status"],
          rows.map((r) => [r.userName, r.courseTitle, r.status]),
        ),
      );
    } else {
      const rows = quizScores.data ?? [];
      reportsApi.downloadCsv(
        "quiz-scores-report.csv",
        reportsApi.toCsv(
          ["Person", "Quiz", "Course", "Score %", "Submitted"],
          rows.map((r) => [r.userName, r.quizTitle, r.courseTitle, r.scorePercent, new Date(r.submittedAt).toLocaleDateString()]),
        ),
      );
    }
  }

  const isEmpty =
    (kind === "completion" && (completion.data?.length ?? 0) === 0) ||
    (kind === "engagement" && (engagement.data?.length ?? 0) === 0) ||
    (kind === "compliance" && (compliance.data?.length ?? 0) === 0) ||
    (kind === "quizScores" && (quizScores.data?.length ?? 0) === 0);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <button onClick={onBack} className="mb-3 text-sm font-medium text-accent hover:underline">
        ← Reports
      </button>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">{REPORT_LABELS[kind]} Report</h1>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={isLoading}>
          Export CSV
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <select
          aria-label="Date range"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as ReportDateRange)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
        >
          {(Object.keys(RANGE_LABELS) as ReportDateRange[]).map((r) => (
            <option key={r} value={r}>
              {RANGE_LABELS[r]}
            </option>
          ))}
        </select>
        <select
          aria-label="Department"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading report...</p>
      ) : isEmpty ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            No{" "}
            {kind === "completion"
              ? "completions"
              : kind === "engagement"
                ? "activity"
                : kind === "quizScores"
                  ? "quiz attempts"
                  : "records"}{" "}
            in this range
          </p>
        </Card>
      ) : kind === "completion" ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Person</TableTh>
                <TableTh>Course</TableTh>
                <TableTh>Completed</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {completion.data!.map((r, i) => (
                <TableRow key={i}>
                  <TableTd>{r.userName}</TableTd>
                  <TableTd>{r.courseTitle}</TableTd>
                  <TableTd>{new Date(r.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : kind === "engagement" ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Person</TableTh>
                <TableTh>Course</TableTh>
                <TableTh>Progress</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {engagement.data!.map((r, i) => (
                <TableRow key={i}>
                  <TableTd>{r.userName}</TableTd>
                  <TableTd>{r.courseTitle}</TableTd>
                  <TableTd>{r.progressPercent}%</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : kind === "compliance" ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Person</TableTh>
                <TableTh>Course</TableTh>
                <TableTh>Status</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {compliance.data!.map((r, i) => (
                <TableRow key={i}>
                  <TableTd>{r.userName}</TableTd>
                  <TableTd>{r.courseTitle}</TableTd>
                  <TableTd>
                    <Badge
                      variant={
                        r.status === "completed" ? "success" : r.status === "in_progress" ? "warning" : "neutral"
                      }
                    >
                      {r.status === "completed" ? "Completed" : r.status === "in_progress" ? "In progress" : "Not started"}
                    </Badge>
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Person</TableTh>
                <TableTh>Quiz</TableTh>
                <TableTh>Course</TableTh>
                <TableTh>Score</TableTh>
                <TableTh>Submitted</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {quizScores.data!.map((r, i) => (
                <TableRow key={i}>
                  <TableTd>{r.userName}</TableTd>
                  <TableTd>{r.quizTitle}</TableTd>
                  <TableTd>{r.courseTitle}</TableTd>
                  <TableTd>
                    <Badge variant={r.scorePercent >= 70 ? "success" : r.scorePercent >= 40 ? "warning" : "danger"}>
                      {r.scorePercent}%
                    </Badge>
                  </TableTd>
                  <TableTd>{new Date(r.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
