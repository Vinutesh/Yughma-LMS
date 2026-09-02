import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission } from "../trpc/trpc.js";

/**
 * Mirrors `frontend/src/lib/api/resources/users.ts` procedure-for-procedure.
 * One contract change from the mock: the mock used a sentinel string
 * `"role_learner"` to mean "no manage-mode role" because its seed data gave
 * every system role a fixed, human-readable id. Real roles get real cuids,
 * so there's no id that could mean that — `roleId: null` is the real
 * equivalent of "clear to just Learner."
 */
export const usersRouter = router({
  list: requirePermission("users", "view").query(({ ctx }) => {
    return ctx.db.user.findMany({ include: { roles: { include: { role: true } } } });
  }),

  updateRole: requirePermission("users", "manage")
    .input(z.object({ userId: z.string(), roleId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      // `UserRole` has no direct orgId column, so it's absent from
      // tenantScope.ts's TENANT_SCOPED_MODELS — deleteMany/create against it
      // by a raw userId/roleId would run unscoped otherwise. Confirming both
      // belong to the caller's org first (via the scoped client, which
      // returns null rather than another org's row) is what actually
      // enforces isolation here; skipping this would let `users:manage` in
      // org A reassign org B's user's roles, or grant org B's role id to an
      // org A user.
      const targetUser = await ctx.db.user.findUnique({ where: { id: input.userId } });
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      if (input.roleId) {
        const targetRole = await ctx.db.role.findUnique({ where: { id: input.roleId } });
        if (!targetRole) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }

      await ctx.db.userRole.deleteMany({ where: { userId: input.userId } });
      if (input.roleId) {
        await ctx.db.userRole.create({ data: { userId: input.userId, roleId: input.roleId } });
      }
      return ctx.db.user.findUniqueOrThrow({ where: { id: input.userId } });
    }),

  deactivate: requirePermission("users", "manage")
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Same "last Org Admin" guard as the frontend mock — re-implemented
      // here because this check is a business rule, not a UI courtesy, and
      // must hold even if a request never goes through the app's own forms.
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: { roles: { include: { role: true } } },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      const isOrgAdmin = target.roles.some((ur) => ur.role.name === "Org Admin");
      if (isOrgAdmin) {
        const remainingAdmins = await ctx.db.user.count({
          where: {
            id: { not: input.userId },
            status: "active",
            roles: { some: { role: { name: "Org Admin" } } },
          },
        });
        if (remainingAdmins === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This is the only Org Admin. Assign another admin first.",
          });
        }
      }
      return ctx.db.user.update({ where: { id: input.userId }, data: { status: "deactivated" } });
    }),

  reactivate: requirePermission("users", "manage")
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.user.update({ where: { id: input.userId }, data: { status: "active" } }),
    ),

  updateAssignment: requirePermission("users", "manage")
    .input(z.object({ userId: z.string(), departmentId: z.string().nullable(), teamId: z.string().nullable() }))
    .mutation(({ ctx, input }) =>
      ctx.db.user.update({
        where: { id: input.userId },
        data: { departmentId: input.departmentId, teamId: input.teamId },
      }),
    ),

  // `invite` is intentionally not implemented yet: the mock's version could
  // fabricate an active account with no password because it shared one
  // global mock password for every user. A real invite needs its own
  // `Invitation` model (token, expiry, accept-time password set) wired to
  // the frontend's existing Accept Invitation screen — a separate migration,
  // not a one-line port of the mock function. See BACKEND_PLAN.md.
});
