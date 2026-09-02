import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";
import type { rawPrisma } from "../db.js";

type RawDb = typeof rawPrisma;

/**
 * Mirrors `frontend/src/lib/api/resources/academies.ts`. `Academy` only
 * ever lives in the one platform org now (see BACKEND_PLAN.md's
 * platform-model note). Management procedures (`create`/`update`/
 * `setCourses`/`setPaths`/`publish`/`delete`) are unreachable by any
 * client-org account anyway (`courses:edit` never lives outside the
 * platform org), so those stay on `ctx.db`. The learner-facing reads
 * (`catalog`/`get`) are reachable by anyone, so those — and the
 * `summarize`/`courseIds` helpers they call — read via `ctx.rawDb` instead;
 * the caller's own `ctx.db` would come back empty for a client-org learner.
 * `pathIds` mirrors the schema: a flat array field on `Academy` itself
 * (like `CareerPath.skillIds`), not a join table, so it's validated against
 * real `LearningPath` rows but stored directly.
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

async function summarize(db: RawDb, academy: { id: string; pathIds: string[] }) {
  const courseCount = await db.academyCourse.count({ where: { academyId: academy.id } });
  return { itemCount: courseCount + academy.pathIds.length };
}

/** Flat course-id list — the frontend builder reads/writes this the same way
 * it reads/writes `pathIds` (a direct array field on `Academy` itself). */
async function courseIds(db: RawDb, academyId: string): Promise<string[]> {
  const rows = await db.academyCourse.findMany({ where: { academyId } });
  return rows.map((r) => r.courseId);
}

export const academiesRouter = router({
  list: requirePermission("courses", "view").query(async ({ ctx }) => {
    const academies = await ctx.db.academy.findMany({ orderBy: { createdAt: "desc" } });
    return Promise.all(
      academies.map(async (a) => ({ ...a, ...(await summarize(ctx.db, a)), courseIds: await courseIds(ctx.db, a.id) })),
    );
  }),

  /** Published academies only — what the Catalog's "Browse by Academy" filter offers. */
  catalog: protectedProcedure.query(async ({ ctx }) => {
    const academies = await ctx.rawDb.academy.findMany({ where: { status: "published" } });
    return Promise.all(
      academies.map(async (a) => ({
        ...a,
        ...(await summarize(ctx.rawDb, a)),
        courseIds: await courseIds(ctx.rawDb, a.id),
      })),
    );
  }),

  get: protectedProcedure.input(z.object({ academyId: z.string() })).query(async ({ ctx, input }) => {
    const academy = await ctx.rawDb.academy.findUnique({ where: { id: input.academyId } });
    if (!academy) throw new TRPCError({ code: "NOT_FOUND", message: "Academy not found." });
    // Draft academies are an authoring artifact — same visibility rule
    // `courses.get`/`paths.get`/`careerPaths.get` enforce, org check
    // included: without it, any org holding `courses:edit` (never true for
    // a real client org, but not something to rely on here) could preview
    // every other org's drafts by id.
    if (
      academy.status !== "published" &&
      !(ctx.session.orgId === academy.orgId && (await hasEditPermission(ctx.db, ctx.session.roleIds)))
    ) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Academy not found." });
    }
    return {
      ...academy,
      ...(await summarize(ctx.rawDb, academy)),
      courseIds: await courseIds(ctx.rawDb, academy.id),
    };
  }),

  create: requirePermission("courses", "edit")
    .input(z.object({ title: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.academy.create({
        data: { orgId: ctx.session.orgId, title: input.title.trim(), createdByUserId: ctx.session.userId },
      }),
    ),

  update: requirePermission("courses", "edit")
    .input(z.object({ academyId: z.string(), title: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ ctx, input: { academyId, ...patch } }) => {
      const academy = await ctx.db.academy.findUnique({ where: { id: academyId } });
      if (!academy) throw new TRPCError({ code: "NOT_FOUND", message: "Academy not found." });
      return ctx.db.academy.update({ where: { id: academyId }, data: patch });
    }),

  /** Replaces the full course set for the academy in one shot. */
  setCourses: requirePermission("courses", "edit")
    .input(z.object({ academyId: z.string(), courseIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const academy = await ctx.db.academy.findUnique({ where: { id: input.academyId } });
      if (!academy) throw new TRPCError({ code: "NOT_FOUND", message: "Academy not found." });

      for (const courseId of input.courseIds) {
        const course = await ctx.db.course.findUnique({ where: { id: courseId } });
        if (!course) throw new TRPCError({ code: "BAD_REQUEST", message: "One of those courses no longer exists." });
      }

      await ctx.db.academyCourse.deleteMany({ where: { academyId: input.academyId } });
      for (const courseId of input.courseIds) {
        await ctx.db.academyCourse.create({ data: { academyId: input.academyId, courseId } });
      }
      return { ok: true };
    }),

  /** Replaces the full path set for the academy in one shot. */
  setPaths: requirePermission("courses", "edit")
    .input(z.object({ academyId: z.string(), pathIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const academy = await ctx.db.academy.findUnique({ where: { id: input.academyId } });
      if (!academy) throw new TRPCError({ code: "NOT_FOUND", message: "Academy not found." });

      for (const pathId of input.pathIds) {
        const path = await ctx.db.learningPath.findUnique({ where: { id: pathId } });
        if (!path) throw new TRPCError({ code: "BAD_REQUEST", message: "One of those paths no longer exists." });
      }

      return ctx.db.academy.update({ where: { id: input.academyId }, data: { pathIds: input.pathIds } });
    }),

  publish: requirePermission("courses", "edit")
    .input(z.object({ academyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const academy = await ctx.db.academy.findUnique({ where: { id: input.academyId } });
      if (!academy) throw new TRPCError({ code: "NOT_FOUND", message: "Academy not found." });
      const courseCount = await ctx.db.academyCourse.count({ where: { academyId: input.academyId } });
      if (courseCount === 0 && academy.pathIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one course or path before publishing." });
      }
      return ctx.db.academy.update({
        where: { id: input.academyId },
        data: { status: "published", publishedAt: new Date() },
      });
    }),

  delete: requirePermission("courses", "edit")
    .input(z.object({ academyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const academy = await ctx.db.academy.findUnique({ where: { id: input.academyId } });
      if (!academy) throw new TRPCError({ code: "NOT_FOUND", message: "Academy not found." });
      await ctx.db.academy.delete({ where: { id: input.academyId } });
      return { ok: true };
    }),
});
