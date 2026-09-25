import crypto from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../trpc/trpc.js";
import { login as loginUser, AuthError } from "../auth/login.js";
import { deleteSession } from "../auth/session.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { rawPrisma } from "../db.js";
import { appUrl, sendForgotPasswordEmail } from "../email/resend.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

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
    .mutation(async ({ input, ctx }) => {
      try {
        const { token, userId } = await loginUser(input.email, input.password, ctx.ip);
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

  /** Always returns `{ ok: true }` regardless of whether the email actually
   * matches an account — a different response would let anyone probe which
   * addresses have accounts (the same enumeration concern `login` already
   * guards against, see `auth/login.ts`). If it does match, mints a
   * single-use, 30-minute token, stores only its hash (never the raw value —
   * see `PasswordResetToken`'s own schema comment), and emails a link
   * carrying the raw token. */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await rawPrisma.user.findFirst({ where: { email: input.email.trim().toLowerCase() } });
      if (user) {
        const rawToken = crypto.randomBytes(32).toString("base64url");
        await rawPrisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
        });
        const resetUrl = `${appUrl()}/forgot-password?token=${rawToken}`;
        await sendForgotPasswordEmail(user.email, user.name, resetUrl);
      }
      return { ok: true };
    }),

  /** Consumes a token minted by `requestPasswordReset` — rejects a
   * missing/expired/already-used one with the same message either way (no
   * reason to distinguish "expired" from "already used" from "never
   * existed" for the caller). Revokes every existing session and clears
   * login lockouts, same cleanup the admin-triggered reset in `users.ts`
   * does, since a password reset is exactly the moment old sessions
   * shouldn't survive. */
  resetPasswordWithToken: publicProcedure
    .input(z.object({ token: z.string().min(1), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const record = await rawPrisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(input.token) } });
      if (!record || record.usedAt || record.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired. Request a new one." });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await rawPrisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, mustChangePassword: false },
      });
      await rawPrisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      await rawPrisma.authSession.deleteMany({ where: { userId: record.userId } });
      const user = await rawPrisma.user.findUnique({ where: { id: record.userId }, select: { email: true } });
      if (user) await rawPrisma.loginAttempt.deleteMany({ where: { email: user.email } });
      return { ok: true };
    }),

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
