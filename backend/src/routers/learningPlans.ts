import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";

/**
 * Mirrors `frontend/src/lib/api/resources/learningPlans.ts`. `LearningPlan`
 * only ever lives in the one platform org now (see BACKEND_PLAN.md's
 * platform-model note) — this was `Academy` before it was narrowed to
 * grouping `LearningPath`s only (no direct courses) and renamed to match
 * what it's actually for. Management procedures (`create`/`update`/
 * `setPaths`/`publish`/`delete`) are unreachable by any client-org account
 * anyway (`courses:edit` never lives outside the platform org), so those
 * stay on `ctx.db`. The learner-facing reads (`catalog`/`get`) are reachable
 * by anyone, so those read via `ctx.rawDb` instead; the caller's own
 * `ctx.db` would come back empty for a client-org learner. `pathIds` mirrors
 * the schema: a flat array field on `LearningPlan` itself, not a join
 * table, so it's validated against real `LearningPath` rows but stored
 * directly.
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

export const learningPlansRouter = router({
  list: requirePermission("courses", "view").query(({ ctx }) => ctx.db.learningPlan.findMany({ orderBy: { createdAt: "desc" } })),

  /** Published plans only — what the Catalog's "Browse by Learning Plan" filter offers. */
  catalog: protectedProcedure.query(({ ctx }) => ctx.rawDb.learningPlan.findMany({ where: { status: "published" } })),

  get: protectedProcedure.input(z.object({ planId: z.string() })).query(async ({ ctx, input }) => {
    const plan = await ctx.rawDb.learningPlan.findUnique({ where: { id: input.planId } });
    if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Learning plan not found." });
    // Draft plans are an authoring artifact — same visibility rule
    // `courses.get`/`paths.get` enforce, org check
    // included: without it, any org holding `courses:edit` (never true for
    // a real client org, but not something to rely on here) could preview
    // every other org's drafts by id.
    if (
      plan.status !== "published" &&
      !(ctx.session.orgId === plan.orgId && (await hasEditPermission(ctx.db, ctx.session.roleIds)))
    ) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Learning plan not found." });
    }
    return plan;
  }),

  create: requirePermission("courses", "edit")
    .input(z.object({ title: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.learningPlan.create({
        data: { orgId: ctx.session.orgId, title: input.title.trim(), createdByUserId: ctx.session.userId },
      }),
    ),

  update: requirePermission("courses", "edit")
    .input(z.object({ planId: z.string(), title: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ ctx, input: { planId, ...patch } }) => {
      const plan = await ctx.db.learningPlan.findUnique({ where: { id: planId } });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Learning plan not found." });
      return ctx.db.learningPlan.update({ where: { id: planId }, data: patch });
    }),

  /** Replaces the full path set for the plan in one shot. */
  setPaths: requirePermission("courses", "edit")
    .input(z.object({ planId: z.string(), pathIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.learningPlan.findUnique({ where: { id: input.planId } });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Learning plan not found." });

      for (const pathId of input.pathIds) {
        const path = await ctx.db.learningPath.findUnique({ where: { id: pathId } });
        if (!path) throw new TRPCError({ code: "BAD_REQUEST", message: "One of those paths no longer exists." });
      }

      return ctx.db.learningPlan.update({ where: { id: input.planId }, data: { pathIds: input.pathIds } });
    }),

  publish: requirePermission("courses", "edit")
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.learningPlan.findUnique({ where: { id: input.planId } });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Learning plan not found." });
      if (plan.pathIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one path before publishing." });
      }
      return ctx.db.learningPlan.update({
        where: { id: input.planId },
        data: { status: "published", publishedAt: new Date() },
      });
    }),

  delete: requirePermission("courses", "edit")
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.learningPlan.findUnique({ where: { id: input.planId } });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Learning plan not found." });
      await ctx.db.learningPlan.delete({ where: { id: input.planId } });
      return { ok: true };
    }),
});
