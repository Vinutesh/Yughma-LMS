import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./_app.js";
import { rawPrisma } from "../db.js";
import { scopedPrisma } from "../trpc/tenantScope.js";
import type { Context } from "../trpc/context.js";

/**
 * Same class of check as `learningCrossOrg.test.ts`, applied to the
 * community/moderation router added in this pass. `Post` carries no direct
 * `orgId` (see tenantScope.ts) — every resolver touching a post by an id
 * from the request must resolve its tenant-scoped parent `Thread` first.
 * This proves org A can't reach into org B's thread or post through any of
 * `communities`'s resolvers, whether the touch is via the unscoped `Post` or
 * the directly-scoped `Thread`/`ContentReport`.
 */
describe("cross-org protection — communities router", () => {
  let orgAId: string;
  let orgBId: string;
  let adminAId: string;
  let adminARoleId: string;

  let courseB: { id: string };
  let threadB: { id: string };
  let postB: { id: string };
  let reportB: { id: string };

  function ctxFor(userId: string, orgId: string, roleIds: string[]): Context {
    return { session: { userId, orgId, roleIds }, db: scopedPrisma(orgId), rawDb: rawPrisma };
  }

  beforeAll(async () => {
    const orgA = await rawPrisma.organization.create({ data: { name: "Community cross-org test — org A" } });
    const orgB = await rawPrisma.organization.create({ data: { name: "Community cross-org test — org B" } });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const adminRole = await rawPrisma.role.create({
      data: { orgId: orgAId, name: "Admin", permissions: { create: [{ resource: "courses", action: "manage" }] } },
    });
    const admin = await rawPrisma.user.create({
      data: { orgId: orgAId, name: "Admin A", email: "admin@org-a-communitytest.test", passwordHash: "x" },
    });
    await rawPrisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
    adminAId = admin.id;
    adminARoleId = adminRole.id;

    const userB = await rawPrisma.user.create({
      data: { orgId: orgBId, name: "User B", email: "user@org-b-communitytest.test", passwordHash: "x" },
    });

    courseB = await rawPrisma.course.create({
      data: { orgId: orgBId, title: "Org B Course", createdByUserId: userB.id },
    });

    threadB = await rawPrisma.thread.create({
      data: { orgId: orgBId, scope: "course", courseId: courseB.id, title: "Thread B", createdByUserId: userB.id },
    });
    postB = await rawPrisma.post.create({
      data: { threadId: threadB.id, authorUserId: userB.id, body: "Post B" },
    });
    reportB = await rawPrisma.contentReport.create({
      data: { orgId: orgBId, postId: postB.id, reportedByUserId: userB.id, reason: "spam" },
    });
  });

  afterAll(async () => {
    // `Post.author` has no `onDelete: Cascade` (unlike `Post.thread`) — a
    // real, deliberate constraint (deleting a user shouldn't silently erase
    // their forum history as a side effect), but it means deleting the org
    // straight through cascades into a blocked "delete User while a Post
    // still references them" error. Deleting threads first (which cascades
    // to their posts/reports) clears that reference before the org/user
    // cascade runs.
    await rawPrisma.thread.deleteMany({ where: { orgId: { in: [orgAId, orgBId] } } });
    await rawPrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await rawPrisma.$disconnect();
  });

  function callerA() {
    return appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
  }

  it("org A cannot read org B's thread", async () => {
    await expect(callerA().communities.getThread({ threadId: threadB.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("org A cannot list org B's course threads", async () => {
    await expect(callerA().communities.listCourseThreads({ courseId: courseB.id })).resolves.toEqual([]);
  });

  // Moderation (pin/lock/remove/dismiss/queue) is platform-admin-only now —
  // org A isn't the platform org, so it's rejected before it ever reaches
  // the thread/report lookup. See `communities.ts`'s own doc comment.
  it("org A cannot pin org B's thread", async () => {
    await expect(callerA().communities.pinThread({ threadId: threadB.id, pinned: true })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const untouched = await rawPrisma.thread.findUnique({ where: { id: threadB.id } });
    expect(untouched?.pinned).toBe(false);
  });

  it("org A cannot lock org B's thread", async () => {
    await expect(callerA().communities.lockThread({ threadId: threadB.id, locked: true })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const untouched = await rawPrisma.thread.findUnique({ where: { id: threadB.id } });
    expect(untouched?.locked).toBe(false);
  });

  it("org A cannot delete org B's thread", async () => {
    await expect(callerA().communities.removeThread({ threadId: threadB.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const stillExists = await rawPrisma.thread.findUnique({ where: { id: threadB.id } });
    expect(stillExists).not.toBeNull();
  });

  it("org A cannot reply to org B's thread", async () => {
    await expect(
      callerA().communities.replyToThread({ threadId: threadB.id, body: "Injected reply" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const count = await rawPrisma.post.count({ where: { threadId: threadB.id } });
    expect(count).toBe(1);
  });

  it("org A cannot remove org B's post (unscoped Post resolved via its parent Thread)", async () => {
    await expect(callerA().communities.removePost({ postId: postB.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const stillExists = await rawPrisma.post.findUnique({ where: { id: postB.id } });
    expect(stillExists).not.toBeNull();
  });

  it("org A cannot report org B's post", async () => {
    await expect(
      callerA().communities.reportPost({ postId: postB.id, reason: "harassment" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const count = await rawPrisma.contentReport.count({ where: { postId: postB.id } });
    expect(count).toBe(1);
  });

  it("org A cannot dismiss org B's content report", async () => {
    await expect(callerA().communities.dismissReport({ reportId: reportB.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const untouched = await rawPrisma.contentReport.findUnique({ where: { id: reportB.id } });
    expect(untouched?.resolved).toBe(false);
  });

  it("org A cannot even open the moderation queue — it's not the platform org", async () => {
    await expect(callerA().communities.listModerationQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
