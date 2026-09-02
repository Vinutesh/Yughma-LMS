import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";

/**
 * Real backend-backed reports resource client. The `orgId` argument the mock
 * signatures took is dropped — the backend infers it from the caller's
 * session (see `backend/src/routers/reports.ts`).
 */

export type ReportDateRange = "7d" | "30d" | "90d" | "all";

export interface ReportFilters {
  dateRange: ReportDateRange;
  departmentId?: string;
}

export interface CompletionRow {
  userName: string;
  courseTitle: string;
  completedAt: string;
}

export async function getCompletionReport(filters: ReportFilters): Promise<CompletionRow[]> {
  try {
    return await trpcClient.reports.completion.query(filters);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface EngagementRow {
  userName: string;
  courseTitle: string;
  progressPercent: number;
  lastActivity: string;
}

export async function getEngagementReport(filters: ReportFilters): Promise<EngagementRow[]> {
  try {
    return await trpcClient.reports.engagement.query(filters);
  } catch (err) {
    throw toApiError(err);
  }
}

export type ComplianceStatus = "completed" | "in_progress" | "not_started";

export interface ComplianceRow {
  userName: string;
  courseTitle: string;
  status: ComplianceStatus;
}

export async function getComplianceReport(filters: ReportFilters): Promise<ComplianceRow[]> {
  try {
    return await trpcClient.reports.compliance.query(filters);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface QuizScoreRow {
  userName: string;
  quizTitle: string;
  courseTitle: string;
  scorePercent: number;
  submittedAt: string;
}

export async function getQuizScoresReport(filters: ReportFilters): Promise<QuizScoreRow[]> {
  try {
    return await trpcClient.reports.quizScores.query(filters);
  } catch (err) {
    throw toApiError(err);
  }
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    let s = String(v);
    // Formula-injection guard: every value here (course titles, user names)
    // ultimately comes from something a user typed, and this file is meant to
    // be opened in Excel/Sheets. A cell starting with =, +, -, or @ is
    // interpreted as a formula on open — prefixing with a single quote forces
    // it to render as literal text instead of executing.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
