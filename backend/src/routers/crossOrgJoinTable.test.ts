import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./_app.js";
import { rawPrisma } from "../db.js";
import { scopedPrisma } from "../trpc/tenantScope.js";
import type { Context } from "../trpc/context.js";

/**
 * Proves the fix for the join-table gap documented in tenantScope.ts:
 * `roles.updatePermissions`/`roles.delete`/`users.updateRole` all touch a
 * model with no direct orgId (Permission, UserRole) by an id from the
 * request. Before the fix, org A's `users:manage`/`roles:manage` holder could
 * reach into org B's rows through those ids with no rejection at all.
 */
describe("cross-org join-table protection", () => {
  let orgAId: string;
  let orgBId: string;
  let adminAId: string;
  let adminARoleId: string;
  let userBId: string;
  let roleBId: string;

  function ctxFor(userId: string, orgId: string, roleIds: string[]): Context {
    return { session: { userId, orgId, roleIds }, db: scopedPrisma(orgId), rawDb: rawPrisma };
  }

  beforeAll(async () => {
    const orgA = await rawPrisma.organization.create({ data: { name: "Join-table test — org A" } });
    const orgB = await rawPrisma.organization.create({ data: { name: "Join-table test — org B" } });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const rolesManage = await rawPrisma.role.create({
      data: { orgId: orgAId, name: "Admin", permissions: { create: [{ resource: "roles", action: "manage" }, { resource: "users", action: "manage" }] } },
    });
    const admin = await rawPrisma.user.create({
      data: { orgId: orgAId, name: "Admin A", email: "admin@org-a-jointest.test", passwordHash: "x" },
    });
    await rawPrisma.userRole.create({ data: { userId: admin.id, roleId: rolesManage.id } });
    adminAId = admin.id;
    adminARoleId = rolesManage.id;

    const userB = await rawPrisma.user.create({
      data: { orgId: orgBId, name: "User B", email: "user@org-b-jointest.test", passwordHash: "x" },
    });
    userBId = userB.id;

    const roleB = await rawPrisma.role.create({ data: { orgId: orgBId, name: "Some Role B" } });
    roleBId = roleB.id;
  });

  afterAll(async () => {
    await rawPrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await rawPrisma.$disconnect();
  });

  it("org A's admin cannot reassign org B's user's role via users.updateRole", async () => {
    const caller = appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
    await expect(caller.users.updateRole({ userId: userBId, roleId: roleBId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // And it provably didn't happen.
    const stillNoRole = await rawPrisma.userRole.findMany({ where: { userId: userBId } });
    expect(stillNoRole).toHaveLength(0);
  });

  it("org A's admin cannot grant org B's roleId to an org A user", async () => {
    const userA = await rawPrisma.user.create({
      data: { orgId: orgAId, name: "Plain User A", email: "plain@org-a-jointest.test", passwordHash: "x" },
    });
    const caller = appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
    await expect(caller.users.updateRole({ userId: userA.id, roleId: roleBId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const stillNoRole = await rawPrisma.userRole.findMany({ where: { userId: userA.id } });
    expect(stillNoRole).toHaveLength(0);
  });

  it("org A's admin cannot update permissions on org B's role", async () => {
    const caller = appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
    await expect(
      caller.roles.updatePermissions({ roleId: roleBId, permissions: [{ resource: "courses", action: "manage" }] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const untouched = await rawPrisma.permission.findMany({ where: { roleId: roleBId } });
    expect(untouched).toHaveLength(0);
  });

  it("org A's admin cannot delete org B's role", async () => {
    const caller = appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
    await expect(caller.roles.delete({ roleId: roleBId })).rejects.toMatchObject({ code: "NOT_FOUND" });

    const stillExists = await rawPrisma.role.findUnique({ where: { id: roleBId } });
    expect(stillExists).not.toBeNull();
  });
});
