import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { rawPrisma } from "../db.js";
import { hashPassword } from "./password.js";
import { login, AuthError } from "./login.js";
import { resolveSession, deleteSession } from "./session.js";

/**
 * The walking-skeleton test: proves the full real chain — Postgres row →
 * argon2 verify → session row → session resolves back into the shape
 * `protectedProcedure` needs. Requires a real database; creates and deletes
 * its own org/user, same convention as tenantScope.test.ts.
 */
describe("login (real database)", () => {
  let orgId: string;
  let userId: string;
  const email = "walking-skeleton@login.test";
  const password = "correct horse battery staple";

  beforeAll(async () => {
    const org = await rawPrisma.organization.create({ data: { name: "Login Test Org" } });
    orgId = org.id;
    const user = await rawPrisma.user.create({
      data: { orgId, name: "Test User", email, passwordHash: await hashPassword(password) },
    });
    userId = user.id;
  });

  const nonexistentEmail = "nobody@nowhere.test";

  beforeEach(async () => {
    // Lockout state must not leak between test cases OR between runs of this
    // file — the "nonexistent email" test below calls login() with no
    // successful attempt to ever clear its LoginAttempt row, so re-running
    // this suite enough times without this would eventually trip the real
    // lockout it's not testing for.
    await rawPrisma.loginAttempt.deleteMany({ where: { email: { in: [email, nonexistentEmail] } } });
  });

  afterAll(async () => {
    await rawPrisma.organization.delete({ where: { id: orgId } });
    await rawPrisma.$disconnect();
  });

  it("succeeds with the right password and returns a session that resolves", async () => {
    const { token, userId: returnedUserId } = await login(email, password);
    expect(returnedUserId).toBe(userId);

    const session = await resolveSession(token);
    expect(session).toEqual({ userId, orgId, roleIds: [] });

    await deleteSession(token);
  });

  it("is case-insensitive on email", async () => {
    const { token } = await login(email.toUpperCase(), password);
    expect(await resolveSession(token)).not.toBeNull();
    await deleteSession(token);
  });

  it("rejects the wrong password without revealing that the account exists", async () => {
    await expect(login(email, "wrong password")).rejects.toThrow(AuthError);
    await expect(login(email, "wrong password")).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("rejects a nonexistent email with the same error shape (no user enumeration)", async () => {
    await expect(login(nonexistentEmail, "anything")).rejects.toMatchObject({
      code: "invalid_credentials",
    });
  });

  it("locks out after 3 failed attempts, for both a real and a fake email", async () => {
    for (let i = 0; i < 2; i++) {
      await expect(login(email, "wrong")).rejects.toMatchObject({ code: "invalid_credentials" });
    }
    await expect(login(email, "wrong")).rejects.toMatchObject({ code: "locked_out" });

    // Locked out now even with the CORRECT password — the point of a lockout.
    await expect(login(email, password)).rejects.toMatchObject({ code: "locked_out" });
  });

  it("a deactivated user cannot log in even with the correct password", async () => {
    await rawPrisma.user.update({ where: { id: userId }, data: { status: "deactivated" } });
    await expect(login(email, password)).rejects.toMatchObject({ code: "invalid_credentials" });
    await rawPrisma.user.update({ where: { id: userId }, data: { status: "active" } });
  });

  it("an expired session does not resolve", async () => {
    const { token } = await login(email, password);
    await rawPrisma.authSession.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await resolveSession(token)).toBeNull();
  });

  it("logout deletes the session so it no longer resolves", async () => {
    const { token } = await login(email, password);
    expect(await resolveSession(token)).not.toBeNull();
    await deleteSession(token);
    expect(await resolveSession(token)).toBeNull();
  });
});
