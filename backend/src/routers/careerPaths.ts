import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";
import type { rawPrisma } from "../db.js";

type RawDb = typeof rawPrisma;

/**
 * Mirrors `frontend/src/lib/api/resources/careerPaths.ts`. `CareerPath`/
 * `Skill`/`Course`/`LearningPath` only ever live in the one platform org now
 * (see BACKEND_PLAN.md's platform-model note). Management procedures
 * (`create`/`setSkills`/`publish`/`delete`) are unreachable by any
 * client-org account anyway (`courses:edit` never lives outside the
 * platform org), so those stay on `ctx.db`. The learner-facing reads
 * (`get`/`listMine`/`getMine`) are reachable by anyone, so those — and the
 * `resolveSkills`/`builtSkillIds` helpers they call — read via `ctx.rawDb`
 * instead; the caller's own `ctx.db` would come back empty for a
 * client-org learner.
 */

/** Same pattern as `calendar.ts`/`communities.ts`/`courses.ts`: re-derived
 * from the caller's own roles, never trusted as a request argument. */
async function hasEditPermission(db: ScopedDb, roleIds: string[]): Promise<boolean> {
  const roles = await db.role.findMany({ where: { id: { in: roleIds } }, include: { permissions: true } });
  const rank = { view: 1, edit: 2, manage: 3 } as const;
  return roles.some((role) =>
    role.permissions.some((p) => p.resource === "courses" && rank[p.action as keyof typeof rank] >= rank.edit),
  );
}

interface SkillResolution {
  skillId: string;
  skillName: string;
  resolvedTo: { kind: "path" | "course"; id: string; title: string }[];
}

async function resolveSkills(db: RawDb, skillIds: string[]): Promise<SkillResolution[]> {
  const results: SkillResolution[] = [];
  for (const skillId of skillIds) {
    const skill = await db.skill.findUnique({ where: { id: skillId } });

    const courseSkillLinks = await db.courseSkill.findMany({ where: { skillId } });
    const resolvedTo: SkillResolution["resolvedTo"] = [];
    const seenPaths = new Set<string>();

    for (const link of courseSkillLinks) {
      const course = await db.course.findUnique({ where: { id: link.courseId } });
      if (!course || course.status !== "published") continue;

      const pathLinks = await db.pathCourse.findMany({ where: { courseId: course.id } });
      for (const pl of pathLinks) {
        if (seenPaths.has(pl.pathId)) continue;
        const path = await db.learningPath.findUnique({ where: { id: pl.pathId } });
        if (path && path.status === "published") {
          seenPaths.add(path.id);
          resolvedTo.push({ kind: "path", id: path.id, title: path.title });
        }
      }
      resolvedTo.push({ kind: "course", id: course.id, title: course.title });
    }

    results.push({ skillId, skillName: skill?.name ?? "Unknown skill", resolvedTo });
  }
  return results;
}

export const careerPathsRouter = router({
  list: requirePermission("courses", "view").query(async ({ ctx }) => {
    const paths = await ctx.db.careerPath.findMany({ orderBy: { createdAt: "desc" } });
    return Promise.all(paths.map(async (p) => ({ ...p, skills: await resolveSkills(ctx.db, p.skillIds) })));
  }),

  get: protectedProcedure.input(z.object({ pathId: z.string() })).query(async ({ ctx, input }) => {
    const path = await ctx.rawDb.careerPath.findUnique({ where: { id: input.pathId } });
    if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Career path not found." });
    // Draft career paths are an authoring artifact — same visibility rule
    // `courses.get`/`paths.get` enforce, no enrollment concept to fall back
    // on here so it's published-or-own-org-author, full stop. The org check
    // matters as much as the permission: without it, any org holding
    // `courses:edit` (never true for a real client org, but not something to
    // rely on here) could preview every other org's drafts by id.
    if (path.status !== "published" && !(ctx.session.orgId === path.orgId && (await hasEditPermission(ctx.db, ctx.session.roleIds)))) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Career path not found." });
    }
    return { ...path, skills: await resolveSkills(ctx.rawDb, path.skillIds) };
  }),

  create: requirePermission("courses", "edit")
    .input(z.object({ title: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.careerPath.create({
        data: { orgId: ctx.session.orgId, title: input.title.trim(), createdByUserId: ctx.session.userId },
      }),
    ),

  setSkills: requirePermission("courses", "edit")
    .input(z.object({ pathId: z.string(), skillIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const path = await ctx.db.careerPath.findUnique({ where: { id: input.pathId } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Career path not found." });
      if (new Set(input.skillIds).size !== input.skillIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A skill can only appear once." });
      }
      for (const skillId of input.skillIds) {
        const skill = await ctx.db.skill.findUnique({ where: { id: skillId } });
        if (!skill) throw new TRPCError({ code: "BAD_REQUEST", message: "One of those skills no longer exists." });
      }
      return ctx.db.careerPath.update({ where: { id: input.pathId }, data: { skillIds: input.skillIds } });
    }),

  publish: requirePermission("courses", "edit")
    .input(z.object({ pathId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const path = await ctx.db.careerPath.findUnique({ where: { id: input.pathId } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Career path not found." });
      if (path.skillIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one skill before publishing." });
      }
      return ctx.db.careerPath.update({
        where: { id: input.pathId },
        data: { status: "published", publishedAt: new Date() },
      });
    }),

  delete: requirePermission("courses", "edit")
    .input(z.object({ pathId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const path = await ctx.db.careerPath.findUnique({ where: { id: input.pathId } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Career path not found." });
      await ctx.db.careerPath.delete({ where: { id: input.pathId } });
      return { ok: true };
    }),

  /** Published career paths, annotated with which required skills the
   * learner has already built (via completed courses). No separate "career
   * path enrollment" concept, matching the mock. */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const paths = await ctx.rawDb.careerPath.findMany({ where: { status: "published" } });
    const built = await builtSkillIds(ctx.rawDb, ctx.session.userId);
    return Promise.all(
      paths.map(async (p) => ({
        ...p,
        skills: await resolveSkills(ctx.rawDb, p.skillIds),
        builtSkillIds: p.skillIds.filter((id) => built.has(id)),
      })),
    );
  }),

  getMine: protectedProcedure.input(z.object({ pathId: z.string() })).query(async ({ ctx, input }) => {
    const path = await ctx.rawDb.careerPath.findUnique({ where: { id: input.pathId } });
    if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Career path not found." });
    if (path.status !== "published" && !(ctx.session.orgId === path.orgId && (await hasEditPermission(ctx.db, ctx.session.roleIds)))) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Career path not found." });
    }
    const built = await builtSkillIds(ctx.rawDb, ctx.session.userId);
    return {
      ...path,
      skills: await resolveSkills(ctx.rawDb, path.skillIds),
      builtSkillIds: path.skillIds.filter((id) => built.has(id)),
    };
  }),
});

async function builtSkillIds(db: RawDb, userId: string): Promise<Set<string>> {
  const completed = await db.enrollment.findMany({ where: { userId, status: "completed" } });
  const built = new Set<string>();
  for (const enrollment of completed) {
    const links = await db.courseSkill.findMany({ where: { courseId: enrollment.courseId } });
    for (const link of links) built.add(link.skillId);
  }
  return built;
}
