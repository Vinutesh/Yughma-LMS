import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { toDateStrings } from "@/lib/api/serialization";

/**
 * Real backend-backed dashboard resource client. The `orgId`/`managerUserId`
 * arguments the mock signatures took are dropped — the backend infers both
 * from the caller's session (see `backend/src/routers/dashboard.ts`).
 */

export interface NeedsGradingRow {
  assignmentId: string;
  title: string;
  courseTitle: string;
  ungradedCount: number;
}

export interface LowEngagementRow {
  courseId: string;
  courseTitle: string;
  notStartedCount: number;
}

export interface RecentSubmissionRow {
  submissionId: string;
  assignmentId: string;
  learnerName: string;
  assignmentTitle: string;
  submittedAt: string;
}

export interface InstructorDashboard {
  needsGrading: NeedsGradingRow[];
  lowEngagement: LowEngagementRow[];
  recentSubmissions: RecentSubmissionRow[];
  /** True when there's genuinely nothing to show in any section. */
  empty: boolean;
}

export async function getInstructorDashboard(): Promise<InstructorDashboard> {
  try {
    return await trpcClient.dashboard.instructor.query();
  } catch (err) {
    throw toApiError(err);
  }
}

export interface OverdueRow {
  userId: string;
  learnerName: string;
  courseTitle: string;
  daysOverdue: number;
}

export interface ManagerDashboard {
  teamSize: number;
  completionPercent: number;
  overdue: OverdueRow[];
}

/**
 * Scoped to the manager's own department — the corporate-segment Manager
 * view from the Dashboard module, not an org-wide roll-up. A manager with no
 * department assigned sees an empty team rather than everyone.
 */
export async function getManagerDashboard(): Promise<ManagerDashboard> {
  try {
    return await trpcClient.dashboard.manager.query();
  } catch (err) {
    throw toApiError(err);
  }
}

export interface OrgAdminDashboard {
  activeUsers: number;
  completionsLast30Days: number;
  departments: number;
}

export async function getOrgAdminDashboard(): Promise<OrgAdminDashboard> {
  try {
    return await trpcClient.dashboard.orgAdmin.query();
  } catch (err) {
    throw toApiError(err);
  }
}

export interface ContinueLearningRow {
  courseId: string;
  title: string;
  progressPercent: number;
}

export interface LearnerActivityRow {
  at: string;
  text: string;
}

export interface LearnerDashboard {
  continueLearning: ContinueLearningRow[];
  stats: {
    coursesInProgress: number;
    completedThisMonth: number;
    certificatesEarned: number;
  };
  recentActivity: LearnerActivityRow[];
}

/** The Home page's data — every field real, nothing hardcoded. */
export async function getLearnerDashboard(): Promise<LearnerDashboard> {
  try {
    const data = await trpcClient.dashboard.learner.query();
    return {
      ...data,
      recentActivity: data.recentActivity.map((a) => toDateStrings(a, ["at"])) as unknown as LearnerActivityRow[],
    };
  } catch (err) {
    throw toApiError(err);
  }
}
