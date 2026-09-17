import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";

/**
 * Real backend-backed Learning Paths resource client. `orgId`/`userId`
 * arguments the mock signatures took are dropped — the backend infers both
 * from the caller's session (see `paths.ts` router). Path completion
 * settlement now happens server-side, inside `courses.ts`'s
 * `setLessonComplete`, which calls the router's exported
 * `settlePathCompletion` — there is no longer a frontend-side
 * `mockIssueCertificate`/`settlePathCompletion` to call from here.
 */



export interface PathSummary {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: "draft" | "published";
  certificateTemplateId?: string;
  createdByUserId: string;
  createdAt: string;
  publishedAt?: string;
  courseCount: number;
  enrolledCount: number;
}

function toPathSummary(p: Record<string, unknown>): PathSummary {
  return toDateStrings(nullsToUndefined(p), ["createdAt", "publishedAt"]) as unknown as PathSummary;
}

export type PathStepState = "done" | "in_progress" | "available" | "locked";

export interface PathStep {
  courseId: string;
  title: string;
  status: PathStepState;
  enrollmentId?: string;
  progressPercent: number;
}

export interface PathEnrollment {
  id: string;
  pathId: string;
  userId: string;
  enrolledAt: string;
  completedAt?: string;
}

export interface PathDetail extends PathSummary {
  courseIds: string[];
  steps: PathStep[];
  enrollment: PathEnrollment | null;
  completedCount: number;
  nextCourseId: string | null;
}

function toPathDetail(p: Record<string, unknown>): PathDetail {
  const base = toPathSummary(p);
  const enrollment = p.enrollment
    ? (toDateStrings(nullsToUndefined(p.enrollment as Record<string, unknown>), [
        "enrolledAt",
        "completedAt",
      ]) as unknown as PathEnrollment)
    : null;
  return { ...base, courseIds: p.courseIds as string[], steps: p.steps as PathStep[], enrollment, completedCount: p.completedCount as number, nextCourseId: p.nextCourseId as string | null };
}

export async function listPaths(): Promise<PathSummary[]> {
  try {
    const paths = await trpcClient.paths.list.query();
    return paths.map(toPathSummary);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getPath(pathId: string): Promise<PathDetail> {
  try {
    const path = await trpcClient.paths.get.query({ pathId });
    return toPathDetail(path);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createPath(input: { title: string }): Promise<PathSummary> {
  try {
    const path = await trpcClient.paths.create.mutate({ title: input.title });
    return { ...toPathSummary(path), courseCount: 0, enrolledCount: 0 };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updatePath(
  pathId: string,
  patch: { title?: string; description?: string; certificateTemplateId?: string },
): Promise<void> {
  try {
    await trpcClient.paths.update.mutate({
      pathId,
      ...patch,
      certificateTemplateId: patch.certificateTemplateId === undefined ? undefined : (patch.certificateTemplateId || null),
    });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function setPathCourses(pathId: string, courseIds: string[]): Promise<void> {
  try {
    await trpcClient.paths.setCourses.mutate({ pathId, courseIds });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function publishPath(pathId: string): Promise<void> {
  try {
    await trpcClient.paths.publish.mutate({ pathId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deletePath(pathId: string): Promise<void> {
  try {
    await trpcClient.paths.delete.mutate({ pathId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listMyPaths(): Promise<PathDetail[]> {
  try {
    const paths = await trpcClient.paths.listMine.query();
    return paths.map(toPathDetail);
  } catch (err) {
    throw toApiError(err);
  }
}

/** Every published path's title/course count, regardless of access grant —
 * NOT a self-service "browse and join" list (that no longer exists; access
 * is admin-granted, see `platform.ts`'s `grantPathAccess`). Used to resolve
 * a Learning Plan's member-path names and to power the Path Access admin
 * picker. */
export async function listPathCatalog(): Promise<PathSummary[]> {
  try {
    const paths = await trpcClient.paths.catalog.query();
    return paths.map(toPathSummary);
  } catch (err) {
    throw toApiError(err);
  }
}
