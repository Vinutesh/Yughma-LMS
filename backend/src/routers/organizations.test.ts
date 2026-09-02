import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./_app.js";
import { rawPrisma } from "../db.js";
import { scopedPrisma } from "../trpc/tenantScope.js";
import type { Context } from "../trpc/context.js";

describe("organizations router — cross-org protection", () => {
  let orgAId: string;
  let orgBId: string;
  let adminAId: string;
  let adminARoleId: string;
  let deptBId: string;

  function ctxFor(userId: string, orgId: string, roleIds: string[]): Context {
    return { session: { userId, orgId, roleIds }, db: scopedPrisma(orgId), rawDb: rawPrisma };
  }

  beforeAll(async () => {
    const orgA = await rawPrisma.organization.create({ data: { name: "Org test A" } });
    const orgB = await rawPrisma.organization.create({ data: { name: "Org test B" } });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const role = await rawPrisma.role.create({
      data: { orgId: orgAId, name: "Admin", permissions: { create: [{ resource: "settings", action: "manage" }, { resource: "users", action: "manage" }, { resource: "users", action: "view" }] } },
    });
    adminARoleId = role.id;
    const admin = await rawPrisma.user.create({
      data: { orgId: orgAId, name: "Admin A", email: "admin@org-test-a.test", passwordHash: "x" },
    });
    await rawPrisma.userRole.create({ data: { userId: admin.id, roleId: role.id } });
    adminAId = admin.id;

    const deptB = await rawPrisma.department.create({ data: { orgId: orgBId, name: "Dept B" } });
    deptBId = deptB.id;
  });

  afterAll(async () => {
    await rawPrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await rawPrisma.$disconnect();
  });

  it("updateGeneral only ever touches the caller's own org, ignoring any id in the input shape", async () => {
    const caller = appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
    const updated = await caller.organizations.updateGeneral({ name: "Renamed Org A" });
    expect(updated.id).toBe(orgAId);

    const orgBUnchanged = await rawPrisma.organization.findUnique({ where: { id: orgBId } });
    expect(orgBUnchanged?.name).toBe("Org test B");
  });

  it("createTeam rejects a departmentId belonging to another org", async () => {
    const caller = appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
    await expect(
      caller.organizations.createTeam({ departmentId: deptBId, name: "Sneaky Team" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const noTeamCreated = await rawPrisma.team.findMany({ where: { departmentId: deptBId } });
    expect(noTeamCreated).toHaveLength(0);
  });

  it("inventory counts are scoped to the caller's own org", async () => {
    const caller = appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
    const inventory = await caller.organizations.inventory();
    expect(inventory.userCount).toBe(1); // just Admin A
  });
});
