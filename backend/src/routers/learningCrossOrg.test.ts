import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./_app.js";
import { rawPrisma } from "../db.js";
import { scopedPrisma } from "../trpc/tenantScope.js";
import type { Context } from "../trpc/context.js";

/**
 * Same class of check as `crossOrgJoinTable.test.ts`, applied to the
 * courses/content/assignments/certificates routers added in this pass.
 * `Lesson`, `CourseModule`, `Enrollment`, and `Submission` all carry no
 * direct `orgId` (see tenantScope.ts) — every resolver touching one of
 * these by an id from the request must resolve its tenant-scoped parent
 * first. This proves that holds for org A never being able to reach into
 * org B's rows through any of them.
 */
describe("cross-org protection — learning routers", () => {
  let orgAId: string;
  let orgBId: string;
  let adminAId: string;
  let adminARoleId: string;

  let courseB: { id: string };
  let moduleB: { id: string };
  let lessonB: { id: string };
  let enrollmentB: { id: string };
  let assignmentB: { id: string };
  let submissionB: { id: string };
  let assetB: { id: string };
  let certificateB: { id: string };

  function ctxFor(userId: string, orgId: string, roleIds: string[]): Context {
    return { session: { userId, orgId, roleIds }, db: scopedPrisma(orgId), rawDb: rawPrisma };
  }

  beforeAll(async () => {
    const orgA = await rawPrisma.organization.create({ data: { name: "Learning cross-org test — org A" } });
    const orgB = await rawPrisma.organization.create({ data: { name: "Learning cross-org test — org B" } });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const adminRole = await rawPrisma.role.create({
      data: { orgId: orgAId, name: "Admin", permissions: { create: [{ resource: "courses", action: "manage" }] } },
    });
    const admin = await rawPrisma.user.create({
      data: { orgId: orgAId, name: "Admin A", email: "admin@org-a-learningtest.test", passwordHash: "x" },
    });
    await rawPrisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
    adminAId = admin.id;
    adminARoleId = adminRole.id;

    const userB = await rawPrisma.user.create({
      data: { orgId: orgBId, name: "User B", email: "user@org-b-learningtest.test", passwordHash: "x" },
    });

    courseB = await rawPrisma.course.create({
      data: { orgId: orgBId, title: "Org B Course", createdByUserId: userB.id },
    });
    moduleB = await rawPrisma.courseModule.create({ data: { courseId: courseB.id, title: "Module B", order: 0 } });
    lessonB = await rawPrisma.lesson.create({
      data: { courseId: courseB.id, moduleId: moduleB.id, title: "Lesson B", order: 0, contentType: "text" },
    });
    enrollmentB = await rawPrisma.enrollment.create({ data: { courseId: courseB.id, userId: userB.id } });

    assignmentB = await rawPrisma.assignment.create({
      data: {
        orgId: orgBId,
        courseId: courseB.id,
        title: "Assignment B",
        instructions: "x",
        submissionType: "text",
        pointsPossible: 10,
        createdByUserId: userB.id,
      },
    });
    submissionB = await rawPrisma.submission.create({
      data: { assignmentId: assignmentB.id, userId: userB.id, text: "answer" },
    });

    assetB = await rawPrisma.asset.create({
      data: { orgId: orgBId, name: "asset-b.png", kind: "image", sizeBytes: 100, uploadedByUserId: userB.id },
    });

    const templateB = await rawPrisma.certificateTemplate.create({ data: { orgId: orgBId, name: "Template B" } });
    certificateB = await rawPrisma.certificate.create({
      data: {
        orgId: orgBId,
        templateId: templateB.id,
        userId: userB.id,
        sourceKind: "manual",
        sourceTitle: "Template B",
        verificationCode: "YU-TEST-XORG",
      },
    });
  });

  afterAll(async () => {
    await rawPrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await rawPrisma.$disconnect();
  });

  function callerA() {
    return appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
  }

  it("org A cannot rename org B's course module", async () => {
    await expect(
      callerA().courses.renameModule({ courseId: courseB.id, moduleId: moduleB.id, title: "Hijacked" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const untouched = await rawPrisma.courseModule.findUnique({ where: { id: moduleB.id } });
    expect(untouched?.title).toBe("Module B");
  });

  it("org A cannot update org B's lesson", async () => {
    await expect(
      callerA().courses.updateLesson({ courseId: courseB.id, lessonId: lessonB.id, title: "Hijacked" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const untouched = await rawPrisma.lesson.findUnique({ where: { id: lessonB.id } });
    expect(untouched?.title).toBe("Lesson B");
  });

  it("org A cannot mark org B's enrollment's lesson complete", async () => {
    await expect(
      callerA().courses.setLessonComplete({ enrollmentId: enrollmentB.id, lessonId: lessonB.id, complete: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const untouched = await rawPrisma.enrollment.findUnique({ where: { id: enrollmentB.id } });
    expect(untouched?.completedLessonIds).toHaveLength(0);
  });

  it("org A cannot delete org B's content library asset", async () => {
    await expect(callerA().content.delete({ id: assetB.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const stillExists = await rawPrisma.asset.findUnique({ where: { id: assetB.id } });
    expect(stillExists).not.toBeNull();
  });

  it("org A cannot grade org B's assignment submission", async () => {
    await expect(
      callerA().assignments.grade({ submissionId: submissionB.id, score: 10, feedback: "nice" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const untouched = await rawPrisma.submission.findUnique({ where: { id: submissionB.id } });
    expect(untouched?.score).toBeNull();
  });

  it("org A cannot flag org B's assignment submission", async () => {
    await expect(
      callerA().assignments.setFlag({ submissionId: submissionB.id, flagged: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const untouched = await rawPrisma.submission.findUnique({ where: { id: submissionB.id } });
    expect(untouched?.flagged).toBe(false);
  });

  it("org A cannot revoke org B's certificate", async () => {
    // `certificates.revoke` is platform-admin-only now (see `certificates.ts`) —
    // org A isn't the platform org, so it's rejected before it ever reaches
    // the certificate lookup.
    await expect(callerA().certificates.revoke({ certificateId: certificateB.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const untouched = await rawPrisma.certificate.findUnique({ where: { id: certificateB.id } });
    expect(untouched?.revoked).toBe(false);
  });
});
