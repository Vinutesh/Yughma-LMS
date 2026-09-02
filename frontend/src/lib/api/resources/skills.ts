import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";

/**
 * Real backend-backed Skills resource client. `orgId`/`userId` arguments the
 * mock signatures took are dropped — the backend infers both from the
 * caller's session. `courseCount`/`getMySkills`'s "which courses build this"
 * logic reads real `CourseSkill` join rows via `ctx.db`, not a mock's flat
 * `course.skillIds` array.
 */

export interface Skill {
  id: string;
  orgId: string;
  name: string;
  archived: boolean;
}

export interface SkillSummary extends Skill {
  courseCount: number;
}

export async function listSkills(opts: { includeArchived?: boolean } = {}): Promise<SkillSummary[]> {
  try {
    return await trpcClient.skills.list.query({ includeArchived: opts.includeArchived ?? false });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createSkill(name: string): Promise<Skill> {
  try {
    return await trpcClient.skills.create.mutate({ name });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function renameSkill(skillId: string, name: string): Promise<void> {
  try {
    await trpcClient.skills.rename.mutate({ skillId, name });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function archiveSkill(skillId: string): Promise<void> {
  try {
    await trpcClient.skills.archive.mutate({ skillId });
  } catch (err) {
    throw toApiError(err);
  }
}

export interface SkillProgress {
  skillId: string;
  name: string;
  completedCourses: { courseId: string; title: string; completedAt: string }[];
  inProgressCount: number;
}

export async function getMySkills(): Promise<SkillProgress[]> {
  try {
    return await trpcClient.skills.mine.query();
  } catch (err) {
    throw toApiError(err);
  }
}
