import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";

/**
 * Mirrors `frontend/src/lib/api/resources/skills.ts`. `Skill`/`Course` only
 * ever live in the one platform org now (see BACKEND_PLAN.md's
 * platform-model note). `list`/`create`/`rename`/`archive` are unreachable
 * by any client-org account anyway (`courses:edit`/`view` never live
 * outside the platform org), so those stay on `ctx.db`. `mine` is
 * reachable by any learner, so it reads `Skill`/`Course` via `ctx.rawDb`
 * instead — the caller's own `ctx.db` would come back empty for a
 * client-org learner. `CourseSkill` carries no `orgId` of its own (see
 * tenantScope.ts) and behaves the same either way.
 */

export const skillsRouter = router({
  list: requirePermission("courses", "view")
    .input(z.object({ includeArchived: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const skills = await ctx.db.skill.findMany({
        where: input.includeArchived ? {} : { archived: false },
        orderBy: { name: "asc" },
      });
      return Promise.all(
        skills.map(async (s) => ({
          ...s,
          courseCount: await ctx.db.courseSkill.count({ where: { skillId: s.id } }),
        })),
      );
    }),

  create: requirePermission("courses", "edit")
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const trimmed = input.name.trim();
      if (!trimmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Give the skill a name." });

      const existing = await ctx.db.skill.findMany({ where: { archived: false } });
      if (existing.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new TRPCError({ code: "CONFLICT", message: `"${trimmed}" already exists.` });
      }

      return ctx.db.skill.create({ data: { orgId: ctx.session.orgId, name: trimmed } });
    }),

  rename: requirePermission("courses", "edit")
    .input(z.object({ skillId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const trimmed = input.name.trim();
      if (!trimmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Give the skill a name." });

      const skill = await ctx.db.skill.findUnique({ where: { id: input.skillId } });
      if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found." });

      const others = await ctx.db.skill.findMany({ where: { archived: false } });
      if (others.some((s) => s.id !== input.skillId && s.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new TRPCError({ code: "CONFLICT", message: `"${trimmed}" already exists.` });
      }

      return ctx.db.skill.update({ where: { id: input.skillId }, data: { name: trimmed } });
    }),

  /** Archiving leaves existing course mappings intact — the skill stops
   * being offered for new mappings but history stays readable. */
  archive: requirePermission("courses", "edit")
    .input(z.object({ skillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const skill = await ctx.db.skill.findUnique({ where: { id: input.skillId } });
      if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found." });
      return ctx.db.skill.update({ where: { id: input.skillId }, data: { archived: true } });
    }),

  /**
   * Proficiency is a count of completed courses, not a level or score —
   * matches the mock. A skill the learner has no relationship with at all
   * is filtered out, same as the mock's own screen.
   */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const skills = await ctx.rawDb.skill.findMany({ where: { archived: false } });
    const myEnrollments = await ctx.rawDb.enrollment.findMany({
      where: { userId: ctx.session.userId, status: { not: "requested" } },
    });

    const results = [];
    for (const skill of skills) {
      const links = await ctx.rawDb.courseSkill.findMany({ where: { skillId: skill.id } });
      const completedCourses: { courseId: string; title: string; completedAt: string }[] = [];
      let inProgressCount = 0;

      for (const link of links) {
        const course = await ctx.rawDb.course.findUnique({ where: { id: link.courseId } });
        if (!course) continue;
        const enrollment = myEnrollments.find((e) => e.courseId === course.id);
        if (enrollment?.status === "completed" && enrollment.completedAt) {
          completedCourses.push({
            courseId: course.id,
            title: course.title,
            completedAt: enrollment.completedAt.toISOString(),
          });
        } else if (enrollment?.status === "active") {
          inProgressCount++;
        }
      }

      if (completedCourses.length === 0 && inProgressCount === 0) continue;

      results.push({
        skillId: skill.id,
        name: skill.name,
        completedCourses: completedCourses.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1)),
        inProgressCount,
      });
    }
    return results.sort((a, b) => b.completedCourses.length - a.completedCourses.length);
  }),
});
