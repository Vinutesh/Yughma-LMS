import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../trpc/trpc.js";
import { login as loginUser, AuthError } from "../auth/login.js";
import { deleteSession } from "../auth/session.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { rawPrisma } from "../db.js";

/**
 * Returns the same `{ user, org, roles, permissions }` shape the frontend's
 * mock `Session` type already defines — the login response's job is to give
 * the client everything `sessionStore` currently gets from the mock, so the
 * frontend's own code barely needs to change to consume a real response.
 */
async function buildSessionPayload(userId: string) {
  const user = await rawPrisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { roles: { include: { role: { include: { permissions: true } } } } },
  });
  const roles = user.roles.map((ur) => ur.role);
  const org = await rawPrisma.organization.findUniqueOrThrow({ where: { id: user.orgId } });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      orgId: user.orgId,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    },
    // `isPlatform` lets the frontend show/hide the platform-admin section —
    // a UI convenience only, never the enforcement point (every
    // `platform.*` procedure re-checks this server-side via
    // `requirePlatformAdmin`, same rule as every permission check in this
    // app).
    org,
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      isSystemRole: r.isSystemRole,
      permissions: r.permissions.map((p) => ({ resource: p.resource, action: p.action })),
    })),
    permissions: roles.flatMap((r) => r.permissions.map((p) => ({ resource: p.resource, action: p.action }))),
  };
}

export const authRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        const { token, userId } = await loginUser(input.email, input.password);
        return { token, session: await buildSessionPayload(userId) };
      } catch (err) {
        if (err instanceof AuthError) {
          throw new TRPCError({
            code: err.code === "locked_out" ? "TOO_MANY_REQUESTS" : "UNAUTHORIZED",
            message: err.message,
            cause: err.retryAt ? { retryAt: err.retryAt } : undefined,
          });
        }
        throw err;
      }
    }),

  // There is deliberately no public `signup` anymore — every company
  // account and every learner account is created by a platform admin (see
  // `routers/platform.ts`'s `createClientOrg`/`createClientUser`), never
  // self-service. This is the actual access-control decision, not a missing
  // feature: content and enrollment are both gated by Yughma Tech, and a
  // public "create your own org" endpoint would have been a bypass of that.

  me: protectedProcedure.query(({ ctx }) => buildSessionPayload(ctx.session.userId)),

  /** Also clears `mustChangePassword` — this is the only path that does,
   * whether the caller landed here because of the forced first-login
   * prompt or opened it voluntarily from their profile menu. */
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const user = await rawPrisma.user.findUniqueOrThrow({ where: { id: ctx.session.userId } });
      const valid = await verifyPassword(user.passwordHash, input.currentPassword);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });

      const passwordHash = await hashPassword(input.newPassword);
      await rawPrisma.user.update({
        where: { id: ctx.session.userId },
        data: { passwordHash, mustChangePassword: false },
      });
      return { ok: true };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // A resolved session on a protectedProcedure always came from a real
    // token (see trpc.ts's guard) — this can't actually be undefined at
    // runtime, but the Context type keeps it optional since public
    // procedures don't have one.
    if (ctx.token) await deleteSession(ctx.token);
    return { ok: true };
  }),
});
