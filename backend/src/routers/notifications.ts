import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";

/**
 * Mirrors `frontend/src/lib/api/resources/notifications.ts`. `NotificationItem`
 * carries its own `orgId` (tenant-scoped, see tenantScope.ts) so it's fully
 * auto-scoped by `ctx.db`; every read/write below still additionally filters
 * by `ctx.session.userId` so one org member can't read or mark-read another
 * member's notifications — org scoping alone isn't "this is mine."
 *
 * `NotificationPreference` has no `orgId` at all (its only key is
 * `[userId, category]`) and isn't in `TENANT_SCOPED_MODELS` — that's fine
 * here specifically because every query below is scoped to
 * `ctx.session.userId` (never an id taken from the request), so there's no
 * cross-org id to smuggle through it in the first place.
 */

const CATEGORIES = ["grading", "deadlines", "course_updates", "team_admin", "community"] as const;

/** Same suggested defaults the mock used for a user with no preferences row
 * yet (e.g. created after seed data, via invite). */
const DEFAULT_PREFS: Record<(typeof CATEGORIES)[number], { inApp: boolean; email: boolean }> = {
  grading: { inApp: true, email: true },
  deadlines: { inApp: true, email: false },
  course_updates: { inApp: true, email: false },
  team_admin: { inApp: true, email: true },
  community: { inApp: true, email: false },
};

async function buildPreferences(db: ScopedDb, userId: string) {
  const rows = await db.notificationPreference.findMany({ where: { userId } });
  const byCategory = new Map(rows.map((r) => [r.category, r]));
  const categories = {} as Record<(typeof CATEGORIES)[number], { inApp: boolean; email: boolean }>;
  for (const category of CATEGORIES) {
    const row = byCategory.get(category);
    categories[category] = row ? { inApp: row.inApp, email: row.email } : DEFAULT_PREFS[category];
  }
  return { userId, categories };
}

export const notificationsRouter = router({
  mine: protectedProcedure.query(({ ctx }) =>
    ctx.db.notificationItem.findMany({ where: { userId: ctx.session.userId }, orderBy: { createdAt: "desc" } }),
  ),

  markRead: protectedProcedure
    .input(z.object({ id: z.string(), read: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.notificationItem.findFirst({ where: { id: input.id, userId: ctx.session.userId } });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found." });
      await ctx.db.notificationItem.update({ where: { id: input.id }, data: { read: input.read } });
      return { ok: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notificationItem.updateMany({
      where: { userId: ctx.session.userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }),

  getPreferences: protectedProcedure.query(({ ctx }) => buildPreferences(ctx.db, ctx.session.userId)),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        category: z.enum(CATEGORIES),
        channel: z.enum(["inApp", "email"]),
        value: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await buildPreferences(ctx.db, ctx.session.userId);
      const existing = current.categories[input.category];
      const next = { ...existing, [input.channel]: input.value };
      await ctx.db.notificationPreference.upsert({
        where: { userId_category: { userId: ctx.session.userId, category: input.category } },
        create: { userId: ctx.session.userId, category: input.category, inApp: next.inApp, email: next.email },
        update: { inApp: next.inApp, email: next.email },
      });
      return { ok: true };
    }),
});
