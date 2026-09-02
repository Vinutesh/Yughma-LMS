import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";

/**
 * Real backend-backed Career Paths resource client. `orgId`/`userId`
 * arguments the mock signatures took are dropped — the backend infers both
 * from the caller's session. Skill resolution (`resolvedTo`) and "which
 * skills has this learner built" now read real `Course`/`CourseSkill`/
 * `PathCourse` rows via the backend's `ctx.db`, not the mock course store.
 */



export interface CareerPathSkillResolution {
  skillId: string;
  skillName: string;
  resolvedTo: { kind: "path" | "course"; id: string; title: string }[];
}

export interface CareerPathDetail {
  id: string;
  orgId: string;
  title: string;
  status: "draft" | "published";
  skillIds: string[];
  createdByUserId: string;
  createdAt: string;
  publishedAt?: string;
  skills: CareerPathSkillResolution[];
}

function toCareerPathDetail(p: Record<string, unknown>): CareerPathDetail {
  return toDateStrings(nullsToUndefined(p), ["createdAt", "publishedAt"]) as unknown as CareerPathDetail;
}

export interface CareerPathProgress extends CareerPathDetail {
  builtSkillIds: string[];
}

export async function listCareerPaths(): Promise<CareerPathDetail[]> {
  try {
    const paths = await trpcClient.careerPaths.list.query();
    return paths.map(toCareerPathDetail);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getCareerPath(pathId: string): Promise<CareerPathDetail> {
  try {
    const path = await trpcClient.careerPaths.get.query({ pathId });
    return toCareerPathDetail(path);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createCareerPath(input: { title: string }): Promise<CareerPathDetail> {
  try {
    const path = await trpcClient.careerPaths.create.mutate({ title: input.title });
    return { ...toCareerPathDetail(path), skills: [] };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function setCareerPathSkills(pathId: string, skillIds: string[]): Promise<void> {
  try {
    await trpcClient.careerPaths.setSkills.mutate({ pathId, skillIds });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function publishCareerPath(pathId: string): Promise<void> {
  try {
    await trpcClient.careerPaths.publish.mutate({ pathId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteCareerPath(pathId: string): Promise<void> {
  try {
    await trpcClient.careerPaths.delete.mutate({ pathId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listMyCareerPaths(): Promise<CareerPathProgress[]> {
  try {
    const paths = await trpcClient.careerPaths.listMine.query();
    return paths.map((p) => ({ ...toCareerPathDetail(p), builtSkillIds: p.builtSkillIds }));
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getMyCareerPath(pathId: string): Promise<CareerPathProgress> {
  try {
    const p = await trpcClient.careerPaths.getMine.query({ pathId });
    return { ...toCareerPathDetail(p), builtSkillIds: p.builtSkillIds };
  } catch (err) {
    throw toApiError(err);
  }
}
