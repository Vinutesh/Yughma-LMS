import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";

/**
 * Real backend-backed analytics resource client. The `orgId` argument the
 * mock signatures took is dropped — the backend infers it from the caller's
 * session (see `backend/src/routers/analytics.ts`).
 */

export interface TrendPoint {
  date: string;
  value: number;
}

export interface OrgOverview {
  activeUsers: number;
  completions30d: number;
  avgDaysToComplete: number | null;
  activeUsersTrend: TrendPoint[];
  completionsTrend: TrendPoint[];
  hasEnoughData: boolean;
}

export async function getOrgOverview(): Promise<OrgOverview> {
  try {
    return await trpcClient.analytics.orgOverview.query();
  } catch (err) {
    throw toApiError(err);
  }
}

export type EngagementLevel = "High" | "Medium" | "Low";

export interface CourseAnalyticsRow {
  courseId: string;
  courseTitle: string;
  completionPercent: number;
  engagement: EngagementLevel;
}

export async function getCourseAnalytics(): Promise<CourseAnalyticsRow[]> {
  try {
    return await trpcClient.analytics.courseAnalytics.query();
  } catch (err) {
    throw toApiError(err);
  }
}

export type ProgressBand = "on_track" | "at_risk" | "falling_behind";

export interface LearnerBandCounts {
  onTrack: number;
  atRisk: number;
  fallingBehind: number;
}

export async function getLearnerBands(): Promise<LearnerBandCounts> {
  try {
    return await trpcClient.analytics.learnerBands.query();
  } catch (err) {
    throw toApiError(err);
  }
}
