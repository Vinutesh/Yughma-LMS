import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";

/**
 * Real backend-backed Learning Plans resource client — a Learning Plan is a
 * named, published group of Learning Paths (this was "Academy" before it
 * was narrowed to paths-only and renamed). `orgId`/`userId` arguments the
 * mock signatures took are dropped — the backend infers both from the
 * caller's session. `pathIds` mirrors the schema: a flat array field on
 * `LearningPlan` itself (like `CareerPath.skillIds`), validated against
 * real `LearningPath` rows server-side but stored directly.
 */

export interface LearningPlanSummary {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: "draft" | "published";
  heroImageAssetId?: string;
  pathIds: string[];
  createdByUserId: string;
  createdAt: string;
  publishedAt?: string;
}

function toLearningPlanSummary(p: Record<string, unknown>): LearningPlanSummary {
  return toDateStrings(nullsToUndefined(p), ["createdAt", "publishedAt"]) as unknown as LearningPlanSummary;
}

export async function listLearningPlans(): Promise<LearningPlanSummary[]> {
  try {
    const plans = await trpcClient.learningPlans.list.query();
    return plans.map(toLearningPlanSummary);
  } catch (err) {
    throw toApiError(err);
  }
}

/** Published plans only — what the Catalog's "Browse by Learning Plan" filter offers. */
export async function listPublishedLearningPlans(): Promise<LearningPlanSummary[]> {
  try {
    const plans = await trpcClient.learningPlans.catalog.query();
    return plans.map(toLearningPlanSummary);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getLearningPlan(planId: string): Promise<LearningPlanSummary> {
  try {
    const plan = await trpcClient.learningPlans.get.query({ planId });
    return toLearningPlanSummary(plan);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createLearningPlan(input: { title: string }): Promise<LearningPlanSummary> {
  try {
    const plan = await trpcClient.learningPlans.create.mutate({ title: input.title });
    return { ...toLearningPlanSummary(plan), pathIds: [] };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateLearningPlan(
  planId: string,
  patch: { title?: string; description?: string; pathIds?: string[] },
): Promise<void> {
  try {
    if (patch.title !== undefined || patch.description !== undefined) {
      await trpcClient.learningPlans.update.mutate({
        planId,
        title: patch.title,
        description: patch.description,
      });
    }
    if (patch.pathIds !== undefined) {
      await trpcClient.learningPlans.setPaths.mutate({ planId, pathIds: patch.pathIds });
    }
  } catch (err) {
    throw toApiError(err);
  }
}

export async function publishLearningPlan(planId: string): Promise<void> {
  try {
    await trpcClient.learningPlans.publish.mutate({ planId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteLearningPlan(planId: string): Promise<void> {
  try {
    await trpcClient.learningPlans.delete.mutate({ planId });
  } catch (err) {
    throw toApiError(err);
  }
}
