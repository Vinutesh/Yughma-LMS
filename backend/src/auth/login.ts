import { rawPrisma } from "../db.js";
import { verifyPassword } from "./password.js";
import { createSession } from "./session.js";

const LOCKOUT_THRESHOLD = 3;
const LOCKOUT_DURATION_MS = 30_000;

export class AuthError extends Error {
  code: "invalid_credentials" | "locked_out";
  retryAt?: number;

  constructor(code: "invalid_credentials" | "locked_out", message: string, retryAt?: number) {
    super(message);
    this.code = code;
    this.retryAt = retryAt;
  }
}

/**
 * Mirrors the frontend mock's `login()` exactly (same lockout threshold,
 * same duration, same "don't reveal which emails exist" behavior of tracking
 * attempts by raw email regardless of whether an account exists) — this is
 * the walking-skeleton procedure, so it should look and feel identical to
 * what the app already demonstrated, just backed by a real database.
 *
 * Note: lockout state lives in a single Postgres table, not per-instance
 * memory (unlike the frontend mock's in-memory Maps) — this is already
 * correct for multiple server instances, no fast-follow needed here.
 */
export async function login(
  email: string,
  password: string,
): Promise<{ token: string; userId: string }> {
  const normalizedEmail = email.toLowerCase();
  const now = new Date();

  const attempt = await rawPrisma.loginAttempt.findUnique({ where: { email: normalizedEmail } });
  if (attempt?.lockedUntil && attempt.lockedUntil > now) {
    throw new AuthError("locked_out", "Too many attempts. Try again shortly.", attempt.lockedUntil.getTime());
  }

  // Email is treated as effectively unique across the whole system for login
  // purposes, even though the DB constraint is `@@unique([orgId, email])` —
  // a real org-picker step for the same email in two orgs is out of scope
  // for this pass. See BACKEND_PLAN.md if that ever needs to change.
  const user = await rawPrisma.user.findFirst({ where: { email: normalizedEmail } });
  const valid = !!user && user.status === "active" && (await verifyPassword(user.passwordHash, password));

  if (!valid) {
    const fails = (attempt?.failCount ?? 0) + 1;
    if (fails >= LOCKOUT_THRESHOLD) {
      const retryAt = new Date(now.getTime() + LOCKOUT_DURATION_MS);
      await rawPrisma.loginAttempt.upsert({
        where: { email: normalizedEmail },
        create: { email: normalizedEmail, failCount: 0, lockedUntil: retryAt },
        update: { failCount: 0, lockedUntil: retryAt },
      });
      throw new AuthError("locked_out", "Too many attempts. Try again shortly.", retryAt.getTime());
    }
    await rawPrisma.loginAttempt.upsert({
      where: { email: normalizedEmail },
      create: { email: normalizedEmail, failCount: fails },
      update: { failCount: fails, lockedUntil: null },
    });
    throw new AuthError("invalid_credentials", "Incorrect email or password.");
  }

  await rawPrisma.loginAttempt.deleteMany({ where: { email: normalizedEmail } });
  const token = await createSession(user.id);
  return { token, userId: user.id };
}
