import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, requirePlatformAdmin, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";
import type { rawPrisma } from "../db.js";

type RawDb = typeof rawPrisma;

/**
 * Mirrors `frontend/src/lib/api/resources/communities.ts`. `Thread` and
 * `ContentReport` both carry their own `orgId` (tenant-scoped, see
 * tenantScope.ts) so `ctx.db` auto-scopes them — a course-scoped thread a
 * client-org learner starts is stamped into *their own company's* org, not
 * the platform org, so each client company's course discussion is a
 * private space, invisible to every other client company (and to the
 * platform org's own `ctx.db`). That's a deliberate, reasonable default
 * given no requirement says otherwise, not a bug — but two things that
 * follow from it need explicit handling rather than silently not working:
 *
 * 1. `createThread`'s course-existence check must read `Course` via
 *    `ctx.rawDb` — it only ever lives in the platform org now, so a
 *    client-org learner's `ctx.db.course` would always come back null and
 *    every course thread creation would 404.
 * 2. Moderation (`listModerationQueue`/`pinThread`/`lockThread`/
 *    `removeThread`/`removePost`/`dismissReport`) needs to see reports
 *    filed inside any client company's own discussion space, not just the
 *    platform org's — `requirePermission("courses","edit")` + `ctx.db`
 *    would only ever surface the platform org's own (typically empty)
 *    threads. Those are `requirePlatformAdmin` + `ctx.rawDb` instead, same
 *    "platform moderates across every client org" shape as
 *    `certificates.list`/`platform.listCourseGrants`.
 *
 * `Post` carries no `orgId` of its own — every resolver below that touches
 * one by an id from the request first resolves its parent `Thread` (which
 * returns null for a cross-org row on `ctx.db`, or is looked up directly on
 * `ctx.rawDb` for the moderation procedures) and only then touches the
 * post, using the now-verified thread's id. Same pattern `courses.ts`
 * established for `Lesson`.
 *
 * The mock trusted a client-computed `canModerate` boolean as an argument to
 * several of these; that's re-derived from the caller's own roles here via
 * `hasEditPermission`, never taken from the request — same reasoning as
 * `calendar.ts`'s identical helper.
 */

async function hasEditPermission(db: ScopedDb, roleIds: string[]): Promise<boolean> {
  const roles = await db.role.findMany({ where: { id: { in: roleIds } }, include: { permissions: true } });
  const rank = { view: 1, edit: 2, manage: 3 } as const;
  return roles.some((role) =>
    role.permissions.some((p) => p.resource === "courses" && rank[p.action as keyof typeof rank] >= rank.edit),
  );
}

/**
 * Resolves a post by id the same way `assignments.ts`'s `resolveSubmission`
 * resolves a submission: `Post` carries no `orgId`, so `ctx.db.post` is never
 * automatically org-filtered. Looking its parent `Thread` up through
 * `ctx.db` (which returns null for a cross-org id) is what actually confirms
 * the post belongs to the caller's org.
 */
async function resolvePost(db: RawDb, postId: string) {
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) return null;
  const thread = await db.thread.findUnique({ where: { id: post.threadId } });
  if (!thread) return null;
  return { post, thread };
}

async function summarize(db: ScopedDb, thread: { id: string; createdAt: Date; createdByUserId: string }) {
  const [author, posts] = await Promise.all([
    db.user.findUnique({ where: { id: thread.createdByUserId }, select: { name: true } }),
    db.post.findMany({ where: { threadId: thread.id }, select: { createdAt: true } }),
  ]);
  const lastActivityAt = posts.reduce((latest, p) => (p.createdAt > latest ? p.createdAt : latest), thread.createdAt);
  return { authorName: author?.name ?? "Unknown", postCount: posts.length, lastActivityAt };
}

function sortThreads<T extends { pinned: boolean; lastActivityAt: Date }>(threads: T[]): T[] {
  return threads.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
  });
}

/** Course-scoped threads are gated the same way `courses.get`'s
 * `learnerContext` gates lesson content: a non-moderator must be actively
 * enrolled, or this leaks course-discussion titles/posts to any
 * authenticated org member. */
async function assertCourseThreadAccess(db: ScopedDb, courseId: string, userId: string, canModerate: boolean) {
  if (canModerate) return;
  const enrollment = await db.enrollment.findFirst({ where: { courseId, userId, status: { not: "requested" } } });
  if (!enrollment) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
}

export const communitiesRouter = router({
  listCourseThreads: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const canModerate = await hasEditPermission(ctx.db, ctx.session.roleIds);
      await assertCourseThreadAccess(ctx.db, input.courseId, ctx.session.userId, canModerate);

      const threads = await ctx.db.thread.findMany({ where: { scope: "course", courseId: input.courseId } });
      const summarized = await Promise.all(threads.map(async (t) => ({ ...t, ...(await summarize(ctx.db, t)) })));
      return sortThreads(summarized);
    }),

  listOrgThreads: protectedProcedure.query(async ({ ctx }) => {
    const threads = await ctx.db.thread.findMany({ where: { scope: "org" } });
    const summarized = await Promise.all(threads.map(async (t) => ({ ...t, ...(await summarize(ctx.db, t)) })));
    return sortThreads(summarized);
  }),

  getThread: protectedProcedure.input(z.object({ threadId: z.string() })).query(async ({ ctx, input }) => {
    const thread = await ctx.db.thread.findUnique({ where: { id: input.threadId } });
    if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found." });

    const canModerate = await hasEditPermission(ctx.db, ctx.session.roleIds);
    if (thread.scope === "course" && thread.courseId) {
      await assertCourseThreadAccess(ctx.db, thread.courseId, ctx.session.userId, canModerate);
    }

    const [posts, users] = await Promise.all([
      ctx.db.post.findMany({ where: { threadId: input.threadId }, orderBy: { createdAt: "asc" } }),
      ctx.db.user.findMany({ select: { id: true, name: true } }),
    ]);
    const userName = new Map(users.map((u) => [u.id, u.name]));

    return {
      ...thread,
      ...(await summarize(ctx.db, thread)),
      posts: posts.map((p) => ({ ...p, authorName: userName.get(p.authorUserId) ?? "Unknown" })),
    };
  }),

  createThread: protectedProcedure
    .input(
      z.object({
        scope: z.enum(["course", "org"]),
        courseId: z.string().optional(),
        title: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.scope === "course") {
        if (!input.courseId) throw new TRPCError({ code: "BAD_REQUEST", message: "courseId is required for a course thread." });
        // `Course` only ever lives in the platform org now — `ctx.rawDb`,
        // not `ctx.db`, or this always 404s for a client-org caller.
        const course = await ctx.rawDb.course.findUnique({ where: { id: input.courseId } });
        if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

        // Same access boundary `listCourseThreads`/`getThread` enforce on
        // reads — without this, a non-enrolled org member could start a
        // thread against a course they can't otherwise see is discussed at
        // all, bypassing the read-side check entirely on the write side.
        const canModerate = await hasEditPermission(ctx.db, ctx.session.roleIds);
        await assertCourseThreadAccess(ctx.db, input.courseId, ctx.session.userId, canModerate);
      }

      return ctx.db.$transaction(async (tx) => {
        const thread = await tx.thread.create({
          data: {
            orgId: ctx.session.orgId,
            scope: input.scope,
            courseId: input.scope === "course" ? input.courseId : undefined,
            title: input.title.trim(),
            createdByUserId: ctx.session.userId,
          },
        });
        await tx.post.create({
          data: {
            threadId: thread.id,
            authorUserId: ctx.session.userId,
            body: input.body.trim(),
          },
        });
        return thread;
      });
    }),

  replyToThread: protectedProcedure
    .input(z.object({ threadId: z.string(), body: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.db.thread.findUnique({ where: { id: input.threadId } });
      if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found." });
      if (thread.locked) throw new TRPCError({ code: "FORBIDDEN", message: "This thread is locked." });

      // Same access boundary as `createThread`/`getThread` — a non-enrolled
      // org member with a thread id (e.g. forwarded by someone else) could
      // otherwise post into a course discussion they aren't allowed to read.
      if (thread.scope === "course" && thread.courseId) {
        const canModerate = await hasEditPermission(ctx.db, ctx.session.roleIds);
        await assertCourseThreadAccess(ctx.db, thread.courseId, ctx.session.userId, canModerate);
      }

      const post = await ctx.db.post.create({
        data: { threadId: input.threadId, authorUserId: ctx.session.userId, body: input.body.trim() },
      });

      // Notify the thread starter, not the replier themselves.
      if (thread.createdByUserId !== ctx.session.userId) {
        const author = await ctx.db.user.findUnique({ where: { id: ctx.session.userId }, select: { name: true } });
        await ctx.db.notificationItem.create({
          data: {
            orgId: ctx.session.orgId,
            userId: thread.createdByUserId,
            category: "community",
            title: `${author?.name ?? "Someone"} replied to your thread: "${thread.title}"`,
            targetUrl: thread.scope === "course" ? `/courses/${thread.courseId}/community/${thread.id}` : `/community/${thread.id}`,
          },
        });
      }
      return post;
    }),

  /**
   * Moderation is platform-admin-only from here down — a client company's
   * own `courses:edit` never exists (no client role template grants it),
   * and even if it did, `ctx.db` would only ever surface the platform
   * org's own threads/reports, never another client company's. Reading
   * everything via `ctx.rawDb` is what actually lets Yughma Tech moderate
   * every client company's course-discussion space, not just its own.
   */
  pinThread: requirePlatformAdmin
    .input(z.object({ threadId: z.string(), pinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.rawDb.thread.findUnique({ where: { id: input.threadId } });
      if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found." });
      await ctx.rawDb.thread.update({ where: { id: input.threadId }, data: { pinned: input.pinned } });
      return { ok: true };
    }),

  lockThread: requirePlatformAdmin
    .input(z.object({ threadId: z.string(), locked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.rawDb.thread.findUnique({ where: { id: input.threadId } });
      if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found." });
      await ctx.rawDb.thread.update({ where: { id: input.threadId }, data: { locked: input.locked } });
      return { ok: true };
    }),

  removeThread: requirePlatformAdmin
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.rawDb.thread.findUnique({ where: { id: input.threadId } });
      if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found." });
      // Cascades to the thread's posts, and each post's content reports.
      await ctx.rawDb.thread.delete({ where: { id: input.threadId } });
      return { ok: true };
    }),

  removePost: requirePlatformAdmin
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolvePost(ctx.rawDb, input.postId);
      if (!resolved) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });
      // Cascades to any content reports filed against this post.
      await ctx.rawDb.post.delete({ where: { id: input.postId } });
      return { ok: true };
    }),

  reportPost: protectedProcedure
    .input(z.object({ postId: z.string(), reason: z.enum(["spam", "harassment", "off_topic", "other"]) }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolvePost(ctx.db, input.postId);
      if (!resolved) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });

      await ctx.db.contentReport.create({
        data: {
          orgId: ctx.session.orgId,
          postId: input.postId,
          reportedByUserId: ctx.session.userId,
          reason: input.reason,
        },
      });
      return { ok: true };
    }),

  /** Every unresolved report across every client company's discussion
   * space, newest first — the roster a platform admin moderates from. */
  listModerationQueue: requirePlatformAdmin.query(async ({ ctx }) => {
    const reports = await ctx.rawDb.contentReport.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" } });
    const rows = [];
    for (const r of reports) {
      const post = await ctx.rawDb.post.findUnique({ where: { id: r.postId } });
      if (!post) continue;
      const [thread, reporter] = await Promise.all([
        ctx.rawDb.thread.findUnique({ where: { id: post.threadId } }),
        ctx.rawDb.user.findUnique({ where: { id: r.reportedByUserId }, select: { name: true } }),
      ]);
      rows.push({
        ...r,
        postBody: post.body,
        reporterName: reporter?.name ?? "Unknown",
        threadTitle: thread?.title ?? "Unknown thread",
      });
    }
    return rows;
  }),

  dismissReport: requirePlatformAdmin
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.rawDb.contentReport.findUnique({ where: { id: input.reportId } });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      await ctx.rawDb.contentReport.update({ where: { id: input.reportId }, data: { resolved: true } });
      return { ok: true };
    }),
});
