import crypto from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission } from "../trpc/trpc.js";
import { hashPassword } from "../auth/password.js";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../email/resend.js";

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

  /**
   * Adds someone to the caller's OWN org — the counterpart to
   * `platform.createClientUser`, which only ever creates accounts inside a
   * *client* company and so could never add a colleague to Yughma itself.
   * Same mechanics as that one deliberately: a generated temp password
   * returned in the response (never persisted in plaintext) plus a
   * best-effort welcome email, and `mustChangePassword` so the relayed
   * password can't stay the permanent one.
   *
   * This replaces the old `invite` stub, which threw "not available yet"
   * because a real invite was scoped as its own `Invitation` model with
   * token/expiry/accept-time password set. That's still the nicer flow, but
   * it needs a migration and an accept screen; this reuses the
   * create-with-temp-password path that already works end to end, so adding
   * people works today rather than after a separate project.
   */
  create: requirePermission("users", "manage")
    .input(z.object({ name: z.string().min(1), email: z.string().email(), roleId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();

      // Email is unique per org in the schema, but an address already used
      // in *another* org would still collide at login (which looks users up
      // by email alone), so this checks globally via `rawDb`, not just the
      // caller's own tenant.
      const existing = await ctx.rawDb.user.findFirst({ where: { email } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email." });

      if (input.roleId) {
        const role = await ctx.db.role.findUnique({ where: { id: input.roleId } });
        if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }

      const tempPassword = crypto.randomBytes(9).toString("base64url");
      const user = await ctx.db.user.create({
        data: {
          orgId: ctx.session.orgId,
          name: input.name.trim(),
          email,
          passwordHash: await hashPassword(tempPassword),
          mustChangePassword: true,
        },
      });
      if (input.roleId) {
        await ctx.db.userRole.create({ data: { userId: user.id, roleId: input.roleId } });
      }

      // Reported back rather than assumed: if the send failed (an
      // unverified sending domain will reject every address but the
      // account owner's), the admin needs to know to pass the temp
      // password along themselves.
      const emailSent = await sendWelcomeEmail(user.email, user.name, tempPassword);

      return { user, tempPassword, emailSent };
    }),

  /**
   * Issues a fresh temporary password for someone in the caller's own org.
   * This is the only password-recovery path that exists: `/forgot-password`
   * is still an unbuilt placeholder and `auth.changePassword` requires an
   * existing session, so before this, an account whose temp password never
   * reached its owner (a bounced welcome email, a dialog closed before the
   * password was copied) was permanently unreachable — a real dead end
   * that had to be fixed by hand against the database.
   *
   * Returns the password so it can be relayed directly, exactly like
   * `create` does, since the email is best-effort.
   */
  resetPassword: requirePermission("users", "manage")
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Scoped lookup: an admin can only ever reset someone inside their
      // own org, never a cross-tenant account.
      const user = await ctx.db.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      const tempPassword = crypto.randomBytes(9).toString("base64url");
      await ctx.db.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
      });

      // Any active session belongs to whoever held the *old* password —
      // a reset exists precisely because that may be the wrong person, so
      // they're revoked rather than left running.
      await ctx.rawDb.authSession.deleteMany({ where: { userId: user.id } });
      // Clear the lockout counter too: someone locked out from failed
      // attempts shouldn't still be blocked with a brand-new password.
      await ctx.rawDb.loginAttempt.deleteMany({ where: { email: user.email } });

      const emailSent = await sendPasswordResetEmail(user.email, user.name, tempPassword);
      return { tempPassword, emailSent };
    }),
});
