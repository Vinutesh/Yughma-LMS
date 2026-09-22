import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../trpc/trpc.js";

/**
 * A simple, explainable rule-based v1 — not a trained model, deliberately,
 * until there's enough real onboarding data to train one on meaningfully.
 * Kept as its own named function so it's easy to extend later without
 * touching the resolver around it.
 */
export function computeLeadScore(input: { persona: string | null; goal: string | null; orgSize: string | null; inviteCount: number }): number {
  let score = 0;
  if (input.persona === "Sell training to clients") score += 30;
  if (input.goal && input.goal.trim().length > 0) score += 10;
  if (input.orgSize === "201–500" || input.orgSize === "500+") score += 20;
  if (input.inviteCount > 0) score += 10;
  return score;
}

export const learnerProfileRouter = router({
  /**
   * Called from each onboarding wizard step as the learner completes it —
   * `protectedProcedure`, not a permission check, since this is always
   * about the caller's own profile, keyed off their own session. Upserts
   * rather than requiring the profile to already exist, since a step can
   * arrive before any other (the wizard lets each step be skipped).
   */
  saveOnboarding: protectedProcedure
    .input(z.object({ persona: z.string().optional(), goal: z.string().optional(), inviteCount: z.number().int().min(0).optional() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.rawDb.organization.findUnique({ where: { id: ctx.session.orgId }, select: { size: true } });
      const existing = await ctx.db.learnerProfile.findUnique({ where: { userId: ctx.session.userId } });

      const persona = input.persona ?? existing?.persona ?? null;
      const goal = input.goal ?? existing?.goal ?? null;
      const leadScore = computeLeadScore({
        persona,
        goal,
        orgSize: org?.size ?? null,
        inviteCount: input.inviteCount ?? 0,
      });

      return ctx.db.learnerProfile.upsert({
        where: { userId: ctx.session.userId },
        create: { orgId: ctx.session.orgId, userId: ctx.session.userId, persona, goal, leadScore },
        update: { persona, goal, leadScore },
      });
    }),

  mine: protectedProcedure.query(({ ctx }) => ctx.db.learnerProfile.findUnique({ where: { userId: ctx.session.userId } })),

  /** Same permission tier as Reports/Analytics — this is the CRM/lead-gen
   * capability's one visible surface today, per the client's own ask that
   * this be demonstrable inside the product, not just a database row. */
  list: requirePermission("reports", "view").query(async ({ ctx }) => {
    const profiles = await ctx.db.learnerProfile.findMany({ orderBy: { leadScore: "desc" } });
    const users = await ctx.db.user.findMany({
      where: { id: { in: profiles.map((p) => p.userId) } },
      select: { id: true, name: true, email: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));
    return profiles.map((p) => ({
      ...p,
      userName: userById.get(p.userId)?.name ?? "Unknown",
      userEmail: userById.get(p.userId)?.email ?? "",
    }));
  }),
});
