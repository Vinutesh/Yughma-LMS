import crypto from "node:crypto";
import { rawPrisma } from "../db.js";
import type { Session } from "../trpc/context.js";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Session tokens are opaque random values, not JWTs — the whole point of
 * database-backed sessions is that revoking one means deleting a row, not
 * waiting out an expiry the server can't take back early.
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  await rawPrisma.authSession.create({
    data: { token, userId, expiresAt: new Date(Date.now() + SESSION_DURATION_MS) },
  });
  return token;
}

/**
 * Resolves a token into the `Session` shape `protectedProcedure` expects —
 * looked up via `rawDb` deliberately: there's no orgId to scope to before the
 * token resolves to a user, and this is the one place in the codebase that's
 * supposed to reach for the unscoped client (see context.ts's own comment on
 * why nowhere else should).
 */
export async function resolveSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;

  const authSession = await rawPrisma.authSession.findUnique({
    where: { token },
    include: { user: { include: { roles: true } } },
  });
  if (!authSession) return null;

  if (authSession.expiresAt < new Date()) {
    // Expired sessions are cleaned up lazily, on the read that finds them —
    // no separate cron job needed for a table this small.
    await rawPrisma.authSession.delete({ where: { token } }).catch(() => {});
    return null;
  }

  if (authSession.user.status !== "active") return null;

  return {
    userId: authSession.userId,
    orgId: authSession.user.orgId,
    roleIds: authSession.user.roles.map((r) => r.roleId),
  };
}

export async function deleteSession(token: string): Promise<void> {
  await rawPrisma.authSession.delete({ where: { token } }).catch(() => {
    // Already gone — logging out twice isn't an error.
  });
}
