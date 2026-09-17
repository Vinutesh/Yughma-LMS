import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./_app.js";
import { rawPrisma } from "../db.js";
import { scopedPrisma } from "../trpc/tenantScope.js";
import type { Context } from "../trpc/context.js";

/**
 * Same-org (not cross-org) access-control checks — a learner who never
 * enrolled in a course/path/learning plan, and holds no `courses:edit`
 * permission, must not be able to read its content just by knowing or
 * guessing its id.
 *
 * This is the class of bug the cross-org test suites don't cover: everything
 * here happens inside ONE org, so `tenantScope.ts`'s org filter was never
 * going to catch it — these resolvers used to trust a client-supplied
 * `learnerContext` boolean (courses.get/assignments.get) or had no
 * status/permission check at all (paths/learningPlans.get,
 * communities createThread/replyToThread).
 */
describe("same-org access control — draft/invite-only content and course-thread membership", () => {
  let orgId: string;
  let learnerId: string;
  let outsiderId: string; // never enrolled anywhere
  let instructorId: string;
  let instructorRoleId: string;

  let draftCourseId: string;
  let inviteCourseId: string;
  let assignmentId: string;
  let draftPathId: string;
  let draftPlanId: string;
  let courseThreadId: string;

  function ctxFor(userId: string, roleIds: string[]): Context {
    return { session: { userId, orgId, roleIds }, db: scopedPrisma(orgId), rawDb: rawPrisma };
  }

  beforeAll(async () => {
    const org = await rawPrisma.organization.create({ data: { name: "Same-org access-control test" } });
    orgId = org.id;

    const instructorRole = await rawPrisma.role.create({
      data: {
        orgId,
        name: "Instructor",
        permissions: { create: [{ resource: "courses", action: "edit" }] },
      },
    });
    instructorRoleId = instructorRole.id;

    const instructor = await rawPrisma.user.create({
      data: { orgId, name: "Instructor", email: "instructor@same-org-test.dev", passwordHash: "x" },
    });
    instructorId = instructor.id;
    await rawPrisma.userRole.create({ data: { userId: instructor.id, roleId: instructorRole.id } });

    const learner = await rawPrisma.user.create({
      data: { orgId, name: "Enrolled Learner", email: "learner@same-org-test.dev", passwordHash: "x" },
    });
    learnerId = learner.id;

    const outsider = await rawPrisma.user.create({
      data: { orgId, name: "Outsider", email: "outsider@same-org-test.dev", passwordHash: "x" },
    });
    outsiderId = outsider.id;

    const draftCourse = await rawPrisma.course.create({
      data: { orgId, title: "Draft course", status: "draft", createdByUserId: instructorId },
    });
    draftCourseId = draftCourse.id;

    // Named for the access pattern under test (enrollment-gated, not
    // catalog-visible), not a real `visibility` field — that field (along
    // with `enrollmentMode`) was intentionally dropped from the schema when
    // self-service enrollment was removed; see courses.ts's own comment.
    const inviteCourse = await rawPrisma.course.create({
      data: { orgId, title: "Published invite-only course", status: "published", createdByUserId: instructorId },
    });
    inviteCourseId = inviteCourse.id;

    await rawPrisma.enrollment.create({ data: { courseId: inviteCourseId, userId: learnerId, status: "active" } });

    const assignment = await rawPrisma.assignment.create({
      data: {
        orgId,
        courseId: inviteCourseId,
        title: "Secret assignment",
        instructions: "Confidential instructions",
        submissionType: "text",
        pointsPossible: 10,
        createdByUserId: instructorId,
      },
    });
    assignmentId = assignment.id;

    const draftPath = await rawPrisma.learningPath.create({
      data: { orgId, title: "Draft path", status: "draft", createdByUserId: instructorId },
    });
    draftPathId = draftPath.id;

    const draftPlan = await rawPrisma.learningPlan.create({
      data: { orgId, title: "Draft learning plan", status: "draft", createdByUserId: instructorId },
    });
    draftPlanId = draftPlan.id;

    const thread = await rawPrisma.thread.create({
      data: { orgId, scope: "course", courseId: inviteCourseId, title: "Course-only thread", createdByUserId: instructorId },
    });
    courseThreadId = thread.id;
    await rawPrisma.post.create({ data: { threadId: thread.id, authorUserId: instructorId, body: "First post" } });
  });

  afterAll(async () => {
    // `Post.authorUserId` has no cascade of its own (only `Post.thread` does)
    // — deleting the org cascades into deleting its users, which fails with
    // a FK-restrict error while a Post still references one as author.
    await rawPrisma.post.deleteMany({ where: { thread: { orgId } } });
    await rawPrisma.organization.delete({ where: { id: orgId } });
    await rawPrisma.$disconnect();
  });

  it("a non-enrolled, non-editor caller cannot read a draft course's outline via courses.get", async () => {
    const caller = appRouter.createCaller(ctxFor(outsiderId, []));
    await expect(caller.courses.get({ courseId: draftCourseId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a non-enrolled caller cannot read a published invite-only course they aren't enrolled in", async () => {
    const caller = appRouter.createCaller(ctxFor(outsiderId, []));
    await expect(caller.courses.get({ courseId: inviteCourseId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("an enrolled learner CAN read the invite-only course they're enrolled in", async () => {
    const caller = appRouter.createCaller(ctxFor(learnerId, []));
    const course = await caller.courses.get({ courseId: inviteCourseId });
    expect(course.id).toBe(inviteCourseId);
  });

  it("an instructor (courses:edit) can read a draft course even without enrollment", async () => {
    const caller = appRouter.createCaller(ctxFor(instructorId, [instructorRoleId]));
    const course = await caller.courses.get({ courseId: draftCourseId });
    expect(course.id).toBe(draftCourseId);
  });

  it("a non-enrolled caller cannot read another course's assignment instructions", async () => {
    const caller = appRouter.createCaller(ctxFor(outsiderId, []));
    await expect(caller.assignments.get({ assignmentId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("an enrolled learner CAN read the assignment for their own course", async () => {
    const caller = appRouter.createCaller(ctxFor(learnerId, []));
    const assignment = await caller.assignments.get({ assignmentId });
    expect(assignment.id).toBe(assignmentId);
  });

  it("a non-editor caller cannot read a draft learning path by id", async () => {
    const caller = appRouter.createCaller(ctxFor(outsiderId, []));
    await expect(caller.paths.get({ pathId: draftPathId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a non-editor caller cannot read a draft learning plan by id", async () => {
    const caller = appRouter.createCaller(ctxFor(outsiderId, []));
    await expect(caller.learningPlans.get({ planId: draftPlanId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a non-enrolled caller cannot start a course-scoped thread against a course they can't see", async () => {
    const caller = appRouter.createCaller(ctxFor(outsiderId, []));
    await expect(
      caller.communities.createThread({ scope: "course", courseId: inviteCourseId, title: "Sneaky", body: "hi" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a non-enrolled caller cannot reply to a course-scoped thread by id", async () => {
    const caller = appRouter.createCaller(ctxFor(outsiderId, []));
    await expect(
      caller.communities.replyToThread({ threadId: courseThreadId, body: "sneaky reply" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("an enrolled learner CAN reply to the course thread", async () => {
    const caller = appRouter.createCaller(ctxFor(learnerId, []));
    const post = await caller.communities.replyToThread({ threadId: courseThreadId, body: "legit reply" });
    expect(post.threadId).toBe(courseThreadId);
  });
});
