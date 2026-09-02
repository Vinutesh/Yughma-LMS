import { z } from "zod";
import { router, requirePermission } from "../trpc/trpc.js";

/**
 * Mirrors `frontend/src/lib/api/resources/billing.ts`. Billing settings
 * (plan, seat limit, subscription status, cancel flag, payment method,
 * next invoice date) live on the `Organization` model itself — which is
 * deliberately absent from tenantScope.ts's TENANT_SCOPED_MODELS (it's the
 * tenant identity, not a tenant-scoped child) — so every procedure here
 * that touches those fields operates on `ctx.session.orgId`, never an
 * `orgId` argument from the request. See `organizations.ts`'s doc comment
 * for why accepting one would let any org edit another org's row.
 *
 * `Invoice` and `SeatRequest` ARE tenant-scoped models (both carry a direct
 * `orgId` column — see tenantScope.ts), so those go through `ctx.db` as
 * usual and get auto-filtered.
 *
 * No real payment processor is wired up here (nor was one in the mock) —
 * `updatePaymentMethod` just records brand/last4 the same way the mock
 * "collected" it, and `choosePlan` starts a subscription without charging
 * anything. That scope is unchanged; only the storage is now Postgres.
 */

const PLAN_PRICING_CENTS: Record<string, number> = {
  starter: 9900,
  growth: 49900,
  enterprise: 0,
};

export const billingRouter = router({
  getState: requirePermission("settings", "manage").query(async ({ ctx }) => {
    const [org, seatsUsed] = await Promise.all([
      ctx.rawDb.organization.findUnique({ where: { id: ctx.session.orgId } }),
      ctx.db.user.count({ where: { status: "active" } }),
    ]);
    return {
      plan: org?.plan ?? null,
      trialEndsAt: org?.trialEndsAt ?? null,
      planChosenAt: org?.planChosenAt ?? null,
      seatLimit: org?.seatLimit ?? null,
      subscriptionStatus: org?.subscriptionStatus ?? null,
      cancelAtPeriodEnd: org?.cancelAtPeriodEnd ?? false,
      paymentMethodBrand: org?.paymentMethodBrand ?? null,
      paymentMethodLast4: org?.paymentMethodLast4 ?? null,
      nextInvoiceAt: org?.nextInvoiceAt ?? null,
      seatsUsed,
    };
  }),

  /**
   * Records the choice only — no card is charged (ROADMAP Phase 1, same as
   * the mock). `seatLimit` comes from the frontend's own `PLANS` catalog
   * (plan metadata/pricing copy is a frontend-only concern, never persisted
   * server-side beyond the numbers that matter for enforcement) — enterprise
   * passes `undefined`, meaning unlimited.
   */
  choosePlan: requirePermission("settings", "manage")
    .input(
      z.object({
        planId: z.enum(["starter", "growth", "enterprise"]),
        seatLimit: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const org = await ctx.rawDb.organization.update({
        where: { id: ctx.session.orgId },
        data: {
          plan: input.planId,
          planChosenAt: now,
          seatLimit: input.seatLimit ?? null,
          subscriptionStatus: "active",
          cancelAtPeriodEnd: false,
          nextInvoiceAt: new Date(now.getTime() + 30 * 86400000),
        },
      });

      // Backfill a small invoice history so the Billing tab has real rows to
      // show immediately, same as the mock's synthesized history — except
      // these are now real persisted `Invoice` rows, not computed on read.
      const amountCents = PLAN_PRICING_CENTS[input.planId] ?? 0;
      await ctx.db.invoice.createMany({
        data: [0, 1, 2].map((monthsAgo) => ({
          orgId: ctx.session.orgId,
          amountCents,
          issuedAt: new Date(now.getTime() - monthsAgo * 30 * 86400000),
          status: "paid",
        })),
      });

      return org;
    }),

  listInvoices: requirePermission("settings", "manage").query(({ ctx }) =>
    ctx.db.invoice.findMany({ orderBy: { issuedAt: "desc" } }),
  ),

  updatePaymentMethod: requirePermission("settings", "manage")
    .input(z.object({ brand: z.string().min(1), last4: z.string().regex(/^\d{4}$/) }))
    .mutation(({ ctx, input }) =>
      ctx.rawDb.organization.update({
        where: { id: ctx.session.orgId },
        data: { paymentMethodBrand: input.brand, paymentMethodLast4: input.last4 },
      }),
    ),

  requestSeats: requirePermission("settings", "manage")
    .input(z.object({ additionalSeats: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      ctx.db.seatRequest.create({
        data: {
          orgId: ctx.session.orgId,
          requestedByUserId: ctx.session.userId,
          additionalSeats: input.additionalSeats,
        },
      }),
    ),

  cancelSubscription: requirePermission("settings", "manage").mutation(async ({ ctx }) => {
    const org = await ctx.rawDb.organization.update({
      where: { id: ctx.session.orgId },
      data: { cancelAtPeriodEnd: true },
    });
    await ctx.rawDb.auditLogEntry.create({
      data: {
        orgId: ctx.session.orgId,
        actorUserId: ctx.session.userId,
        action: "plan_changed",
        summary: "Subscription canceled (effective at period end)",
      },
    });
    return org;
  }),
});
