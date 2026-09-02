import type { Assignment, Submission, SubmissionType } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined } from "@/lib/api/serialization";


function toDateStrings<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): T {
  const out: Record<string, unknown> = { ...obj };
  for (const key of keys) {
    const v = out[key as string];
    if (v instanceof Date) out[key as string] = v.toISOString();
  }
  return out as T;
}

export interface AssignmentSummary extends Assignment {
  courseTitle: string;
  submissionCount: number;
  ungradedCount: number;
}

function toAssignmentSummary(a: Record<string, unknown>): AssignmentSummary {
  return toDateStrings(nullsToUndefined(a), ["dueAt", "createdAt"]) as unknown as AssignmentSummary;
}

export async function listAssignments(): Promise<AssignmentSummary[]> {
  try {
    const assignments = await trpcClient.assignments.list.query();
    return assignments.map(toAssignmentSummary);
  } catch (err) {
    throw toApiError(err);
  }
}

/** `learnerContext` is kept as a no-op parameter for existing call sites —
 * the backend now always enforces the enrollment check server-side (or
 * `courses:edit`, for the manage queue) rather than trusting a
 * client-supplied flag to opt into it. See `assignments.ts`'s `get` resolver
 * on the backend for why a client-trusted flag was a bug, not a convenience. */
export async function getAssignment(assignmentId: string, _learnerContext = false): Promise<AssignmentSummary> {
  try {
    const a = await trpcClient.assignments.get.query({ assignmentId });
    return toAssignmentSummary(a);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface CreateAssignmentInput {
  courseId: string;
  title: string;
  instructions: string;
  dueAt?: string;
  submissionType: SubmissionType;
  pointsPossible: number;
}

export async function createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
  try {
    const a = await trpcClient.assignments.create.mutate({
      ...input,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
    });
    return toDateStrings(nullsToUndefined(a), ["dueAt", "createdAt"]) as unknown as Assignment;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateAssignment(
  assignmentId: string,
  patch: Partial<Pick<Assignment, "title" | "instructions" | "dueAt" | "submissionType" | "pointsPossible">>,
): Promise<void> {
  try {
    await trpcClient.assignments.update.mutate({
      assignmentId,
      ...patch,
      dueAt: patch.dueAt === undefined ? undefined : patch.dueAt ? new Date(patch.dueAt) : null,
    });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  try {
    await trpcClient.assignments.delete.mutate({ assignmentId });
  } catch (err) {
    throw toApiError(err);
  }
}

export interface SubmissionWithLearner extends Submission {
  learnerName: string;
  /** Submitted after the assignment's due date. */
  late: boolean;
}

export async function listSubmissions(assignmentId: string): Promise<SubmissionWithLearner[]> {
  try {
    const submissions = await trpcClient.assignments.listSubmissions.query({ assignmentId });
    return submissions.map((s) => toDateStrings(nullsToUndefined(s), ["submittedAt", "gradedAt"])) as unknown as SubmissionWithLearner[];
  } catch (err) {
    throw toApiError(err);
  }
}

/** The learner's own submission, if they've made one. */
export async function getMySubmission(assignmentId: string): Promise<Submission | null> {
  try {
    const s = await trpcClient.assignments.getMySubmission.query({ assignmentId });
    return s ? (toDateStrings(nullsToUndefined(s), ["submittedAt", "gradedAt"]) as unknown as Submission) : null;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function submitAssignment(input: {
  assignmentId: string;
  text?: string;
  assetId?: string;
}): Promise<Submission> {
  try {
    const s = await trpcClient.assignments.submit.mutate(input);
    return toDateStrings(nullsToUndefined(s), ["submittedAt", "gradedAt"]) as unknown as Submission;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function gradeSubmission(input: { submissionId: string; score: number; feedback: string }): Promise<void> {
  try {
    await trpcClient.assignments.grade.mutate(input);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function setSubmissionFlag(submissionId: string, flagged: boolean): Promise<void> {
  try {
    await trpcClient.assignments.setFlag.mutate({ submissionId, flagged });
  } catch (err) {
    throw toApiError(err);
  }
}

export interface LearnerAssignment extends AssignmentSummary {
  submission: Submission | null;
}

/** Assignments across every course the learner is actively enrolled in. */
export async function listMyAssignments(): Promise<LearnerAssignment[]> {
  try {
    const assignments = await trpcClient.assignments.mine.query();
    return assignments.map((a) => ({
      ...toAssignmentSummary(a),
      submission: a.submission ? (toDateStrings(nullsToUndefined(a.submission), ["submittedAt", "gradedAt"]) as unknown as Submission) : null,
    }));
  } catch (err) {
    throw toApiError(err);
  }
}
