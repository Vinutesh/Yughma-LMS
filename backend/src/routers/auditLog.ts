import { z } from "zod";
import { AuditActionType } from "../generated/prisma/client.js";
import { router, requirePermission } from "../trpc/trpc.js";

/**
 * Read side of `frontend/src/lib/api/resources/auditLog.ts`. `AuditLogEntry`
 * is directly tenant-scoped (see tenantScope.ts), so `ctx.db.auditLogEntry`
 * is already filtered to the caller's org with no manual join needed. Actual
 * writes already happen from other already-migrated routers
 * (`courses.publish`/`archive`, `certificates.revoke`, ...) via
 * `ctx.db.auditLogEntry.create(...)` — this router only adds the list query,
 * mirroring the manage/audit-log page's filters (actor, action, date range).
 *
 * Gated on `roles:view`, same permission tier the frontend page uses — a
 * compliance/security surface, not a general "reports" one.
 */
export const auditLogRouter = router({
  list: requirePermission("roles", "view")
    .input(
      z.object({
        actorUserId: z.string().optional(),
        action: z.nativeEnum(AuditActionType).optional(),
        /** Inclusive lower bound. */
        since: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.auditLogEntry.findMany({
        where: {
          actorUserId: input.actorUserId || undefined,
          action: input.action,
          at: input.since ? { gte: new Date(input.since) } : undefined,
        },
        orderBy: { at: "desc" },
      });

      const actorIds = [...new Set(entries.map((e) => e.actorUserId).filter((id): id is string => id !== null))];
      const actors = await ctx.db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
      const nameById = new Map(actors.map((a) => [a.id, a.name]));

      // `actorUserId` is null once that account's been deleted (SetNull —
      // see the schema's own comment) — the entry itself still stands, it
      // just no longer names a live account.
      return entries.map((e) => ({
        ...e,
        actorName: e.actorUserId ? (nameById.get(e.actorUserId) ?? "Unknown") : "Deleted user",
      }));
    }),
});
