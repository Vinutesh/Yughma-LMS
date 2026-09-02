import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission } from "../trpc/trpc.js";

const permissionInput = z.object({
  resource: z.string(),
  action: z.enum(["view", "edit", "manage"]),
});

/**
 * Mirrors `frontend/src/lib/api/resources/roles.ts` procedure-for-procedure.
 * The self-lockout guard on `updatePermissions` is re-implemented here against
 * the caller's *server-side* session roles, not trusted from the request —
 * the frontend's version reads `sessionStore`, which is a UI convenience, not
 * an enforcement boundary (see SECURITY_REVIEW.md).
 */
export const rolesRouter = router({
  list: requirePermission("roles", "view").query(({ ctx }) => {
    return ctx.db.role.findMany({ include: { permissions: true } });
  }),

  create: requirePermission("roles", "manage")
    .input(z.object({ name: z.string().min(1), cloneFromRoleId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const source = input.cloneFromRoleId
        ? await ctx.db.role.findUnique({
            where: { id: input.cloneFromRoleId },
            include: { permissions: true },
          })
        : null;

      return ctx.db.role.create({
        data: {
          // Explicit here to satisfy Prisma's generated types (the scoped
          // client's runtime extension overwrites this unconditionally
          // regardless — see tenantScope.ts's stampOrgId — so this is
          // belt-and-suspenders, not the actual enforcement).
          orgId: ctx.session.orgId,
          name: input.name.trim(),
          isSystemRole: false,
          permissions: source
            ? { create: source.permissions.map((p) => ({ resource: p.resource, action: p.action })) }
            : undefined,
        },
        include: { permissions: true },
      });
    }),

  updatePermissions: requirePermission("roles", "manage")
    .input(z.object({ roleId: z.string(), permissions: z.array(permissionInput) }))
    .mutation(async ({ ctx, input }) => {
      // `Permission` has no direct `orgId` column (it's scoped only through
      // its parent `Role`), so it's deliberately absent from tenantScope.ts's
      // TENANT_SCOPED_MODELS — a `permission.deleteMany({ where: { roleId }})`
      // below would run unscoped otherwise. This lookup is what actually
      // enforces the role belongs to the caller's org before anything below
      // touches its permissions; findUnique on the scoped client returns null
      // for a roleId from another org rather than throwing, which is why this
      // checks explicitly instead of trusting the call not to have thrown.
      const role = await ctx.db.role.findUnique({ where: { id: input.roleId } });
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });

      const callerHoldsThisRole = ctx.session.roleIds.includes(input.roleId);
      if (callerHoldsThisRole) {
        const otherRoles = await ctx.db.role.findMany({
          where: { id: { in: ctx.session.roleIds.filter((id) => id !== input.roleId) } },
          include: { permissions: true },
        });
        const resultingPermissions = [
          ...otherRoles.flatMap((r) => r.permissions),
          ...input.permissions,
        ];
        const stillManagesRoles = resultingPermissions.some(
          (p) => p.resource === "roles" && p.action === "manage",
        );
        if (!stillManagesRoles) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can't remove your own ability to manage roles.",
          });
        }
      }

      await ctx.db.permission.deleteMany({ where: { roleId: input.roleId } });
      return ctx.db.role.update({
        where: { id: input.roleId },
        data: { permissions: { create: input.permissions } },
        include: { permissions: true },
      });
    }),

  delete: requirePermission("roles", "manage")
    .input(z.object({ roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Same reasoning as updatePermissions above: `UserRole` is a join table
      // with no direct orgId, so confirm the role is actually this org's
      // before counting or deleting anything through it.
      const role = await ctx.db.role.findUnique({ where: { id: input.roleId } });
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });

      const assignedCount = await ctx.db.userRole.count({ where: { roleId: input.roleId } });
      if (assignedCount > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `${assignedCount} people still have this role. Reassign them first.`,
        });
      }
      await ctx.db.role.delete({ where: { id: input.roleId } });
      return { ok: true };
    }),
});
