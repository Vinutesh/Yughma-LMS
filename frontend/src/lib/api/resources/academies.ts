import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";

/**
 * Real backend-backed Academies resource client. `orgId`/`userId` arguments
 * the mock signatures took are dropped — the backend infers both from the
 * caller's session. `pathIds` mirrors the schema: a flat array field on
 * `Academy` itself (like `CareerPath.skillIds`), validated against real
 * `LearningPath` rows server-side but stored directly; `courseIds` is
 * derived from the real `AcademyCourse` join table.
 */



export interface AcademySummary {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: "draft" | "published";
  heroImageAssetId?: string;
  courseIds: string[];
  pathIds: string[];
  createdByUserId: string;
  createdAt: string;
  publishedAt?: string;
  itemCount: number;
}

function toAcademySummary(a: Record<string, unknown>): AcademySummary {
  return toDateStrings(nullsToUndefined(a), ["createdAt", "publishedAt"]) as unknown as AcademySummary;
}

export async function listAcademies(): Promise<AcademySummary[]> {
  try {
    const academies = await trpcClient.academies.list.query();
    return academies.map(toAcademySummary);
  } catch (err) {
    throw toApiError(err);
  }
}

/** Published academies only — what the Catalog's "Browse by Academy" filter offers. */
export async function listPublishedAcademies(): Promise<AcademySummary[]> {
  try {
    const academies = await trpcClient.academies.catalog.query();
    return academies.map(toAcademySummary);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getAcademy(academyId: string): Promise<AcademySummary> {
  try {
    const academy = await trpcClient.academies.get.query({ academyId });
    return toAcademySummary(academy);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createAcademy(input: { title: string }): Promise<AcademySummary> {
  try {
    const academy = await trpcClient.academies.create.mutate({ title: input.title });
    return { ...toAcademySummary(academy), courseIds: [], pathIds: [], itemCount: 0 };
  } catch (err) {
    throw toApiError(err);
  }
}

/** Mirrors the mock's single combined `updateAcademy` — title/description go
 * through the `update` mutation, `courseIds`/`pathIds` (which the backend
 * models as a join table and a flat array field, respectively) each go
 * through their own dedicated "replace the whole set" mutation. */
export async function updateAcademy(
  academyId: string,
  patch: { title?: string; description?: string; courseIds?: string[]; pathIds?: string[] },
): Promise<void> {
  try {
    if (patch.title !== undefined || patch.description !== undefined) {
      await trpcClient.academies.update.mutate({
        academyId,
        title: patch.title,
        description: patch.description,
      });
    }
    if (patch.courseIds !== undefined) {
      await trpcClient.academies.setCourses.mutate({ academyId, courseIds: patch.courseIds });
    }
    if (patch.pathIds !== undefined) {
      await trpcClient.academies.setPaths.mutate({ academyId, pathIds: patch.pathIds });
    }
  } catch (err) {
    throw toApiError(err);
  }
}

export async function publishAcademy(academyId: string): Promise<void> {
  try {
    await trpcClient.academies.publish.mutate({ academyId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteAcademy(academyId: string): Promise<void> {
  try {
    await trpcClient.academies.delete.mutate({ academyId });
  } catch (err) {
    throw toApiError(err);
  }
}
