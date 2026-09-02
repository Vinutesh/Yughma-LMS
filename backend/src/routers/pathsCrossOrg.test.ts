import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./_app.js";
import { rawPrisma } from "../db.js";
import { scopedPrisma } from "../trpc/tenantScope.js";
import type { Context } from "../trpc/context.js";

/**
 * Same class of check as `learningCrossOrg.test.ts`, applied to the
 * Learning Paths / Career Paths / Academies / Skills routers added in this
 * pass. `PathCourse` and `AcademyCourse` carry no direct `orgId` (see
 * tenantScope.ts) — every resolver touching one of these by an id from the
 * request must resolve its tenant-scoped parent (`LearningPath` / `Academy`)
 * first. This proves org A can never reach into org B's rows through
 * either join table, and that a direct-by-id lookup of another org's
 * `LearningPath`/`Academy`/`Skill`/`CareerPath` never leaks.
 */
describe("cross-org protection — learning-path/career-path/academy/skill routers", () => {
  let orgAId: string;
  let orgBId: string;
  let adminAId: string;
  let adminARoleId: string;

  let courseB: { id: string };
  let pathB: { id: string };
  let academyB: { id: string };
  let skillB: { id: string };
  let careerPathB: { id: string };

  function ctxFor(userId: string, orgId: string, roleIds: string[]): Context {
    return { session: { userId, orgId, roleIds }, db: scopedPrisma(orgId), rawDb: rawPrisma };
  }

  beforeAll(async () => {
    const orgA = await rawPrisma.organization.create({ data: { name: "Paths cross-org test — org A" } });
    const orgB = await rawPrisma.organization.create({ data: { name: "Paths cross-org test — org B" } });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const adminRole = await rawPrisma.role.create({
      data: { orgId: orgAId, name: "Admin", permissions: { create: [{ resource: "courses", action: "manage" }] } },
    });
    const admin = await rawPrisma.user.create({
      data: { orgId: orgAId, name: "Admin A", email: "admin@org-a-pathstest.test", passwordHash: "x" },
    });
    await rawPrisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
    adminAId = admin.id;
    adminARoleId = adminRole.id;

    const userB = await rawPrisma.user.create({
      data: { orgId: orgBId, name: "User B", email: "user@org-b-pathstest.test", passwordHash: "x" },
    });

    courseB = await rawPrisma.course.create({
      data: { orgId: orgBId, title: "Org B Course", createdByUserId: userB.id },
    });

    pathB = await rawPrisma.learningPath.create({
      data: { orgId: orgBId, title: "Org B Path", createdByUserId: userB.id },
    });
    await rawPrisma.pathCourse.create({ data: { pathId: pathB.id, courseId: courseB.id, order: 0 } });

    academyB = await rawPrisma.academy.create({
      data: { orgId: orgBId, title: "Org B Academy", createdByUserId: userB.id },
    });
    await rawPrisma.academyCourse.create({ data: { academyId: academyB.id, courseId: courseB.id } });

    skillB = await rawPrisma.skill.create({ data: { orgId: orgBId, name: "Org B Skill" } });

    careerPathB = await rawPrisma.careerPath.create({
      data: { orgId: orgBId, title: "Org B Career Path", createdByUserId: userB.id, skillIds: [skillB.id] },
    });
  });

  afterAll(async () => {
    await rawPrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await rawPrisma.$disconnect();
  });

  function callerA() {
    return appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
  }

  it("org A cannot look up org B's learning path by id", async () => {
    await expect(callerA().paths.get({ pathId: pathB.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("org A cannot replace org B's path's course list (PathCourse join table)", async () => {
    await expect(
      callerA().paths.setCourses({ pathId: pathB.id, courseIds: [] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const untouched = await rawPrisma.pathCourse.findMany({ where: { pathId: pathB.id } });
    expect(untouched).toHaveLength(1);
    expect(untouched[0].courseId).toBe(courseB.id);
  });

  it("org A cannot delete org B's learning path", async () => {
    await expect(callerA().paths.delete({ pathId: pathB.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const stillExists = await rawPrisma.learningPath.findUnique({ where: { id: pathB.id } });
    expect(stillExists).not.toBeNull();
  });

  it("org A cannot look up org B's academy by id", async () => {
    await expect(callerA().academies.get({ academyId: academyB.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("org A cannot replace org B's academy's course list (AcademyCourse join table)", async () => {
    await expect(
      callerA().academies.setCourses({ academyId: academyB.id, courseIds: [] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const untouched = await rawPrisma.academyCourse.findMany({ where: { academyId: academyB.id } });
    expect(untouched).toHaveLength(1);
    expect(untouched[0].courseId).toBe(courseB.id);
  });

  it("org A cannot set org B's academy's path list", async () => {
    await expect(
      callerA().academies.setPaths({ academyId: academyB.id, pathIds: [] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("org A cannot rename org B's skill", async () => {
    await expect(
      callerA().skills.rename({ skillId: skillB.id, name: "Hijacked" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const untouched = await rawPrisma.skill.findUnique({ where: { id: skillB.id } });
    expect(untouched?.name).toBe("Org B Skill");
  });

  it("org A cannot archive org B's skill", async () => {
    await expect(callerA().skills.archive({ skillId: skillB.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const untouched = await rawPrisma.skill.findUnique({ where: { id: skillB.id } });
    expect(untouched?.archived).toBe(false);
  });

  it("org A cannot look up org B's career path by id", async () => {
    await expect(callerA().careerPaths.get({ pathId: careerPathB.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("org A cannot set org B's career path's skill list", async () => {
    await expect(
      callerA().careerPaths.setSkills({ pathId: careerPathB.id, skillIds: [] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const untouched = await rawPrisma.careerPath.findUnique({ where: { id: careerPathB.id } });
    expect(untouched?.skillIds).toEqual([skillB.id]);
  });
});
