import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";
import type { rawPrisma } from "../db.js";
import { issueCertificate } from "./certificates.js";

type RawDb = typeof rawPrisma;

/**
 * Mirrors `frontend/src/lib/api/resources/paths.ts`. `LearningPath` only
 * ever lives in the one platform org now (see BACKEND_PLAN.md's
 * platform-model note) — every management procedure (`create`/`update`/
 * `setCourses`/`publish`/`delete`) is unreachable by any client-org account
 * anyway (`courses:edit` is never granted outside the platform org), so
 * those stay on `ctx.db`. Every learner-facing read (`get`/`listMine`/
 * `catalog`/`enroll`) is reachable by anyone, so those read `LearningPath`/
 * `Course` via `ctx.rawDb` instead — the caller's own `ctx.db` would come
 * back empty for a client-org learner. `PathCourse`/`PathEnrollment` carry
 * no `orgId` of their own (see tenantScope.ts) and are read the same way
 * either client behaves identically for them; the parent `LearningPath` is
 * always re-resolved through whichever client is passed in before its id is
 * trusted.
 */

/** Same pattern as `calendar.ts`/`communities.ts`/`courses.ts`: re-derived
 * from the caller's own roles, never trusted as a request argument. */
async function hasEditPermission(db: ScopedDb, roleIds: string[]): Promise<boolean> {
  const roles = await db.role.findMany({ where: { id: { in: roleIds } }, include: { permissions: true } });
  const rank = { view: 1, edit: 2, manage: 3 } as const;
  return roles.some((role) =>
    role.permissions.some((p) => p.resource === "courses" && rank[p.action as keyof typeof rank] >= rank.edit),
  );
}

async function summarize(db: RawDb, path: { id: string }) {
  const [courseCount, enrolledCount] = await Promise.all([
    db.pathCourse.count({ where: { pathId: path.id } }),
    db.pathEnrollment.count({ where: { pathId: path.id } }),
  ]);
  return { courseCount, enrolledCount };
}

/** Ordered course ids for the path — the frontend's path builder reorders
 * this list client-side and round-trips the whole thing to `setCourses`. */
async function orderedCourseIds(db: RawDb, pathId: string): Promise<string[]> {
  const rows = await db.pathCourse.findMany({ where: { pathId }, orderBy: { order: "asc" } });
  return rows.map((r) => r.courseId);
}

export type PathStepState = "done" | "in_progress" | "available" | "locked";

/**
 * Steps are strictly sequential: a course unlocks only once the one before it
 * is complete — same rule as the mock, see `frontend/src/lib/api/resources/paths.ts`.
 */
async function buildSteps(db: RawDb, pathId: string, userId: string | undefined) {
  const pathCourses = await db.pathCourse.findMany({ where: { pathId }, orderBy: { order: "asc" } });

  let previousDone = true;
  const steps = [];
  for (const pc of pathCourses) {
    const course = await db.course.findUnique({ where: { id: pc.courseId } });
    const enrollment = userId
      ? await db.enrollment.findUnique({ where: { courseId_userId: { courseId: pc.courseId, userId } } })
      : null;
    const total = await db.lesson.count({ where: { courseId: pc.courseId } });
    const done = enrollment?.status === "completed";

    let status: PathStepState;
    if (done) status = "done";
    else if (!previousDone) status = "locked";
    else if (enrollment && enrollment.status !== "requested") status = "in_progress";
    else status = "available";

    previousDone = done;

    steps.push({
      courseId: pc.courseId,
      title: course?.title ?? "Unavailable course",
      status,
      enrollmentId: enrollment?.id,
      progressPercent:
        total === 0 || !enrollment ? 0 : Math.round((enrollment.completedLessonIds.length / total) * 100),
    });
  }
  return steps;
}

export const pathsRouter = router({
  list: requirePermission("courses", "view").query(async ({ ctx }) => {
    const paths = await ctx.db.learningPath.findMany({ orderBy: { createdAt: "desc" } });
    return Promise.all(paths.map(async (p) => ({ ...p, ...(await summarize(ctx.db, p)) })));
  }),

  get: protectedProcedure.input(z.object({ pathId: z.string() })).query(async ({ ctx, input }) => {
    const path = await ctx.rawDb.learningPath.findUnique({ where: { id: input.pathId } });
    if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });

    // A draft path is an authoring-in-progress artifact, not something any
    // authenticated org member should be able to read by guessing/enumerating
    // an id — same visibility rule `courses.get` enforces for draft courses.
    // An existing enrollment (only possible on a path that was published at
    // some point) or being its own (platform-org) author previewing it always
    // grants access — `ctx.session.orgId === path.orgId` matters just as much
    // as holding `courses:edit`: without it, any org that happened to hold
    // `courses:edit` (never true for a real client org, but not something to
    // rely on here) could preview every other org's drafts by id.
    if (path.status !== "published") {
      const enrollment = await ctx.rawDb.pathEnrollment.findUnique({
        where: { pathId_userId: { pathId: input.pathId, userId: ctx.session.userId } },
      });
      const isAuthor = ctx.session.orgId === path.orgId && (await hasEditPermission(ctx.db, ctx.session.roleIds));
      if (!enrollment && !isAuthor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });
      }
    }

    const steps = await buildSteps(ctx.rawDb, input.pathId, ctx.session.userId);
    const completedCount = steps.filter((s) => s.status === "done").length;
    const enrollment = await ctx.rawDb.pathEnrollment.findUnique({
      where: { pathId_userId: { pathId: input.pathId, userId: ctx.session.userId } },
    });

    return {
      ...path,
      ...(await summarize(ctx.rawDb, path)),
      courseIds: await orderedCourseIds(ctx.rawDb, input.pathId),
      steps,
      enrollment: enrollment ?? null,
      completedCount,
      nextCourseId: steps.find((s) => s.status !== "done" && s.status !== "locked")?.courseId ?? null,
    };
  }),

  create: requirePermission("courses", "edit")
    .input(z.object({ title: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.learningPath.create({
        data: { orgId: ctx.session.orgId, title: input.title.trim(), createdByUserId: ctx.session.userId },
      }),
    ),

  update: requirePermission("courses", "edit")
    .input(
      z.object({
        pathId: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        certificateTemplateId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input: { pathId, ...patch } }) => {
      const path = await ctx.db.learningPath.findUnique({ where: { id: pathId } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });
      return ctx.db.learningPath.update({ where: { id: pathId }, data: patch });
    }),

  /** Replaces the full ordered course list for the path in one shot — mirrors
   * the mock's `setPathCourses`, which also always sends the whole list. */
  setCourses: requirePermission("courses", "edit")
    .input(z.object({ pathId: z.string(), courseIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const path = await ctx.db.learningPath.findUnique({ where: { id: input.pathId } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });

      if (new Set(input.courseIds).size !== input.courseIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A course can only appear once in a path." });
      }
      for (const courseId of input.courseIds) {
        const course = await ctx.db.course.findUnique({ where: { id: courseId } });
        if (!course) throw new TRPCError({ code: "BAD_REQUEST", message: "One of those courses no longer exists." });
      }

      await ctx.db.pathCourse.deleteMany({ where: { pathId: input.pathId } });
      for (let i = 0; i < input.courseIds.length; i++) {
        await ctx.db.pathCourse.create({ data: { pathId: input.pathId, courseId: input.courseIds[i], order: i } });
      }
      return { ok: true };
    }),

  publish: requirePermission("courses", "edit")
    .input(z.object({ pathId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const path = await ctx.db.learningPath.findUnique({ where: { id: input.pathId } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });

      const pathCourses = await ctx.db.pathCourse.findMany({ where: { pathId: input.pathId } });
      if (pathCourses.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one course before publishing." });
      }

      const unpublished: string[] = [];
      for (const pc of pathCourses) {
        const course = await ctx.db.course.findUnique({ where: { id: pc.courseId } });
        if (course && course.status !== "published") unpublished.push(course.title);
      }
      if (unpublished.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Publish ${unpublished.join(", ")} first — a path can't include draft courses.`,
        });
      }

      return ctx.db.learningPath.update({
        where: { id: input.pathId },
        data: { status: "published", publishedAt: new Date() },
      });
    }),

  delete: requirePermission("courses", "edit")
    .input(z.object({ pathId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const path = await ctx.db.learningPath.findUnique({ where: { id: input.pathId } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });

      const enrolled = await ctx.db.pathEnrollment.count({ where: { pathId: input.pathId } });
      if (enrolled > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `${enrolled} ${enrolled === 1 ? "person is" : "people are"} on this path. It can't be deleted.`,
        });
      }
      await ctx.db.learningPath.delete({ where: { id: input.pathId } });
      return { ok: true };
    }),

  /** Published paths the learner has joined. */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const mine = await ctx.rawDb.pathEnrollment.findMany({ where: { userId: ctx.session.userId } });
    const results = [];
    for (const e of mine) {
      const path = await ctx.rawDb.learningPath.findUnique({ where: { id: e.pathId } });
      if (!path) continue;
      const steps = await buildSteps(ctx.rawDb, path.id, ctx.session.userId);
      const completedCount = steps.filter((s) => s.status === "done").length;
      results.push({
        ...path,
        ...(await summarize(ctx.rawDb, path)),
        courseIds: await orderedCourseIds(ctx.rawDb, path.id),
        steps,
        enrollment: e,
        completedCount,
        nextCourseId: steps.find((s) => s.status !== "done" && s.status !== "locked")?.courseId ?? null,
      });
    }
    return results;
  }),

  /** Published paths the learner hasn't joined yet. */
  catalog: protectedProcedure.query(async ({ ctx }) => {
    const joined = new Set(
      (await ctx.rawDb.pathEnrollment.findMany({ where: { userId: ctx.session.userId } })).map((e) => e.pathId),
    );
    const paths = await ctx.rawDb.learningPath.findMany({ where: { status: "published" } });
    const available = paths.filter((p) => !joined.has(p.id));
    return Promise.all(available.map(async (p) => ({ ...p, ...(await summarize(ctx.rawDb, p)) })));
  }),

  enroll: protectedProcedure.input(z.object({ pathId: z.string() })).mutation(async ({ ctx, input }) => {
    const path = await ctx.rawDb.learningPath.findUnique({ where: { id: input.pathId } });
    if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });
    if (path.status !== "published") {
      throw new TRPCError({ code: "FORBIDDEN", message: "This path isn't published yet." });
    }

    const existing = await ctx.rawDb.pathEnrollment.findUnique({
      where: { pathId_userId: { pathId: input.pathId, userId: ctx.session.userId } },
    });
    if (existing) return existing;

    return ctx.rawDb.pathEnrollment.create({ data: { pathId: input.pathId, userId: ctx.session.userId } });
  }),
});

/**
 * Called after a course completes (from `courses.ts`'s `setLessonComplete`,
 * right after its own certificate-issuance logic): settles any Learning Path
 * whose every course is now finished for this user, and issues its
 * certificate. Always called with `ctx.rawDb` — `LearningPath` lives in the
 * platform org, not necessarily the caller's own, so the caller's scoped
 * client would silently find nothing.
 */
export async function settlePathCompletion(
  db: RawDb,
  orgId: string,
  userId: string,
  completedCourseId: string,
): Promise<{ pathId: string; title: string; certificateId?: string } | undefined> {
  // `PathCourse` has no orgId of its own, but `completedCourseId` was already
  // resolved through the caller's own `Enrollment` check before this ran, so
  // any pathId found here can only belong to a path that references a course
  // this specific user actually completed. The `learningPath.findUnique`
  // below re-verifies the path itself still exists and is published via the
  // scoped client anyway, rather than trusting that alone.
  const links = await db.pathCourse.findMany({ where: { courseId: completedCourseId } });

  for (const link of links) {
    const path = await db.learningPath.findUnique({ where: { id: link.pathId } });
    if (!path || path.status !== "published") continue;

    const enrollment = await db.pathEnrollment.findUnique({
      where: { pathId_userId: { pathId: path.id, userId } },
    });
    if (!enrollment || enrollment.completedAt) continue;

    const pathCourses = await db.pathCourse.findMany({ where: { pathId: path.id } });
    let allDone = true;
    for (const pc of pathCourses) {
      const courseEnrollment = await db.enrollment.findUnique({
        where: { courseId_userId: { courseId: pc.courseId, userId } },
      });
      if (courseEnrollment?.status !== "completed") {
        allDone = false;
        break;
      }
    }
    if (!allDone) continue;

    await db.pathEnrollment.update({ where: { id: enrollment.id }, data: { completedAt: new Date() } });

    let certificateId: string | undefined;
    if (path.certificateTemplateId) {
      const certificate = await issueCertificate(db, {
        orgId,
        userId,
        templateId: path.certificateTemplateId,
        sourceKind: "path",
        sourceId: path.id,
        sourceTitle: path.title,
      });
      certificateId = certificate.id;
    }
    return { pathId: path.id, title: path.title, certificateId };
  }
  return undefined;
}
