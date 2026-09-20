import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";
import type { rawPrisma } from "../db.js";
import { issueCertificate } from "./certificates.js";
import { settlePathCompletion } from "./paths.js";

type RawDb = typeof rawPrisma;

/** Same pattern as `calendar.ts`/`communities.ts`: re-derived from the
 * caller's own roles, never trusted as a request argument. */
async function hasEditPermission(db: ScopedDb, roleIds: string[]): Promise<boolean> {
  const roles = await db.role.findMany({ where: { id: { in: roleIds } }, include: { permissions: true } });
  const rank = { view: 1, edit: 2, manage: 3 } as const;
  return roles.some((role) =>
    role.permissions.some((p) => p.resource === "courses" && rank[p.action as keyof typeof rank] >= rank.edit),
  );
}

/**
 * Mirrors `frontend/src/lib/api/resources/courses.ts`. `Course` is directly
 * tenant-scoped; `CourseModule`, `Lesson`, `Enrollment`, `CoursePrerequisite`
 * are not (see tenantScope.ts) — authoring resolvers (list/create/update/...)
 * below that touch one of those by an id from the request first resolve the
 * parent `Course` via `ctx.db`, which returns null for a cross-org row —
 * unchanged from before, since only the platform org's own staff ever hold
 * `courses:edit`.
 *
 * Learner-facing resolvers (`mine`/`get`/`setLessonComplete`) are different
 * on purpose: every course now belongs to the platform org (Yughma Tech),
 * never a learner's own company, so `ctx.db` — scoped to the *caller's* org
 * — would never see a course at all for a learner. These use `ctx.rawDb`
 * instead, deliberately crossing that boundary, but ONLY after an
 * `Enrollment` row (an access grant a platform admin created — see
 * `routers/platform.ts` — never self-service) proves this specific caller
 * has been granted this specific course. The `Enrollment` lookup itself is
 * always keyed by `ctx.session.userId`, never a request-supplied id, so
 * there's no way to probe another learner's grants through this path.
 *
 * Course-completion certificate issuance AND learning-path completion
 * settlement are both wired: after a course finishes, `setLessonComplete`
 * issues the course's own certificate (if any) and then calls `paths.ts`'s
 * exported `settlePathCompletion`, which checks whether that completion also
 * finishes a Learning Path for this user and issues the path's certificate.
 */

/**
 * Whether this user has cleared this course's qualifying-assignment
 * requirement, if it has one — exported for `assignments.ts`'s `grade` to
 * check the same thing at grading time (certificate issuance can be
 * unlocked from either direction: finishing the last lesson after already
 * being graded, or being graded after already finishing every lesson).
 * Returns true when the course has no qualifying assignment at all, so a
 * caller can gate certificate issuance on this alone regardless of whether
 * a given course uses the feature.
 */
export async function qualifyingAssignmentPassed(rawDb: RawDb, courseId: string, userId: string): Promise<boolean> {
  const qualifying = await rawDb.assignment.findFirst({ where: { courseId, isQualifying: true } });
  if (!qualifying) return true;
  const submission = await rawDb.submission.findFirst({ where: { assignmentId: qualifying.id, userId } });
  if (!submission || submission.score === null) return false;
  return (submission.score / qualifying.pointsPossible) * 100 >= qualifying.passingScorePercent;
}

async function summarize(rawDb: RawDb, course: { id: string; createdByUserId: string }) {
  const [author, moduleCount, lessons, enrolledCount] = await Promise.all([
    rawDb.user.findUnique({ where: { id: course.createdByUserId }, select: { name: true } }),
    rawDb.courseModule.count({ where: { courseId: course.id } }),
    rawDb.lesson.findMany({ where: { courseId: course.id }, select: { estimatedMinutes: true } }),
    rawDb.enrollment.count({ where: { courseId: course.id, status: { not: "requested" } } }),
  ]);
  return {
    authorName: author?.name ?? "Unknown",
    moduleCount,
    lessonCount: lessons.length,
    enrolledCount,
    estimatedMinutes: lessons.reduce((sum, l) => sum + (l.estimatedMinutes ?? 0), 0),
  };
}

export const coursesRouter = router({
  /** Everything the instructor's Manage-mode list shows — drafts included.
   * Platform-org-only (only Yughma Tech staff ever hold `courses:view`), so
   * `ctx.db` (scoped to the caller's own — platform — org) already returns
   * exactly the platform's own catalog with no further check needed. */
  list: requirePermission("courses", "view").query(async ({ ctx }) => {
    const courses = await ctx.db.course.findMany({ orderBy: { createdAt: "desc" } });
    return Promise.all(courses.map(async (c) => ({ ...c, ...(await summarize(ctx.rawDb, c)) })));
  }),

  /** Every course this learner has been explicitly granted (see the file
   * doc comment) — there is no more "browse and self-enroll" catalog. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const enrollments = await ctx.rawDb.enrollment.findMany({ where: { userId: ctx.session.userId } });
    const results = [];
    for (const enrollment of enrollments) {
      const course = await ctx.rawDb.course.findUnique({ where: { id: enrollment.courseId } });
      // A grant for a course that's since been unpublished/archived (or
      // deleted, though delete is blocked while enrollments exist) simply
      // doesn't show — access was granted, but there's nothing to show yet.
      if (!course || course.status !== "published") continue;
      const summary = await summarize(ctx.rawDb, course);
      const progressPercent =
        summary.lessonCount === 0
          ? 0
          : Math.round((enrollment.completedLessonIds.length / summary.lessonCount) * 100);
      results.push({ ...course, ...summary, enrollment, progressPercent });
    }
    return results;
  }),

  get: protectedProcedure.input(z.object({ courseId: z.string() })).query(async ({ ctx, input }) => {
    const course = await ctx.rawDb.course.findUnique({ where: { id: input.courseId } });
    if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

    const enrollment = await ctx.rawDb.enrollment.findUnique({
      where: { courseId_userId: { courseId: input.courseId, userId: ctx.session.userId } },
    });

    // Access requires either a real grant (published courses only — a
    // platform admin can grant access before a course is finished without
    // it being visible yet) or the caller being platform staff with
    // `courses:edit`, previewing/authoring their own org's course. There is
    // no more "published + catalog visible" self-service bypass — nothing
    // is reachable without an explicit grant now that self-enrollment is
    // gone. This used to be gated behind a client-supplied `learnerContext`
    // boolean that defaulted to `false` — any caller could simply omit it
    // to skip the check entirely. Access must never depend on what the
    // request claims about itself, only on server-known facts.
    const hasGrant = !!enrollment && course.status === "published";
    const isAuthor = ctx.session.orgId === course.orgId && (await hasEditPermission(ctx.db, ctx.session.roleIds));
    if (!hasGrant && !isAuthor) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
    }

    const modules = await ctx.rawDb.courseModule.findMany({
      where: { courseId: input.courseId },
      orderBy: { order: "asc" },
    });
    const outline = await Promise.all(
      modules.map(async (m) => ({
        ...m,
        lessons: await ctx.rawDb.lesson.findMany({ where: { moduleId: m.id }, orderBy: { order: "asc" } }),
      })),
    );

    const prereqLinks = await ctx.rawDb.coursePrerequisite.findMany({ where: { courseId: input.courseId } });
    const prerequisites = [];
    for (const link of prereqLinks) {
      const p = await ctx.rawDb.course.findUnique({ where: { id: link.prerequisiteId }, select: { id: true, title: true } });
      if (p) prerequisites.push(p);
    }

    return { ...course, ...(await summarize(ctx.rawDb, course)), outline, prerequisites, enrollment: enrollment ?? null };
  }),

  create: requirePermission("courses", "edit")
    .input(z.object({ title: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.course.create({
        data: { orgId: ctx.session.orgId, title: input.title.trim(), createdByUserId: ctx.session.userId },
      }),
    ),

  update: requirePermission("courses", "edit")
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        certificateTemplateId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input: { courseId, ...patch } }) => {
      const course = await ctx.db.course.findUnique({ where: { id: courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      return ctx.db.course.update({ where: { id: courseId }, data: patch });
    }),

  /** Depth-first walk of the prerequisite graph — a course can't require
   * something that (transitively) already requires it. */
  addPrerequisite: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string(), prerequisiteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.courseId === input.prerequisiteId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A course can't require itself." });
      }
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      const prereq = await ctx.db.course.findUnique({ where: { id: input.prerequisiteId } });
      if (!course || !prereq) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

      const reaches = async (fromId: string, targetId: string, seen = new Set<string>()): Promise<boolean> => {
        if (fromId === targetId) return true;
        if (seen.has(fromId)) return false;
        seen.add(fromId);
        const links = await ctx.db.coursePrerequisite.findMany({ where: { courseId: fromId } });
        for (const link of links) {
          if (await reaches(link.prerequisiteId, targetId, seen)) return true;
        }
        return false;
      };
      if (await reaches(input.prerequisiteId, input.courseId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Adding "${prereq.title}" here would create a loop — it already requires this course.`,
        });
      }

      await ctx.db.coursePrerequisite.upsert({
        where: { courseId_prerequisiteId: { courseId: input.courseId, prerequisiteId: input.prerequisiteId } },
        create: { courseId: input.courseId, prerequisiteId: input.prerequisiteId },
        update: {},
      });
      return { ok: true };
    }),

  removePrerequisite: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string(), prerequisiteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      await ctx.db.coursePrerequisite.deleteMany({ where: { courseId: input.courseId, prerequisiteId: input.prerequisiteId } });
      return { ok: true };
    }),

  publish: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const lessonCount = await ctx.db.lesson.count({ where: { courseId: input.courseId } });
      if (lessonCount === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one lesson before publishing this course." });
      }
      const updated = await ctx.db.course.update({
        where: { id: input.courseId },
        data: { status: "published", publishedAt: new Date() },
      });
      await ctx.db.auditLogEntry.create({
        data: { orgId: ctx.session.orgId, actorUserId: ctx.session.userId, action: "course_published", summary: "Course published", targetLabel: course.title },
      });
      return updated;
    }),

  archive: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const updated = await ctx.db.course.update({ where: { id: input.courseId }, data: { status: "archived" } });
      await ctx.db.auditLogEntry.create({
        data: { orgId: ctx.session.orgId, actorUserId: ctx.session.userId, action: "course_archived", summary: "Course archived", targetLabel: course.title },
      });
      return updated;
    }),

  duplicate: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

      const copy = await ctx.db.course.create({
        data: {
          orgId: ctx.session.orgId,
          title: `${source.title} (copy)`,
          description: source.description,
          certificateTemplateId: source.certificateTemplateId,
          createdByUserId: ctx.session.userId,
        },
      });

      const modules = await ctx.db.courseModule.findMany({ where: { courseId: input.courseId }, orderBy: { order: "asc" } });
      for (const mod of modules) {
        const newModule = await ctx.db.courseModule.create({ data: { courseId: copy.id, title: mod.title, order: mod.order } });
        const lessons = await ctx.db.lesson.findMany({ where: { moduleId: mod.id }, orderBy: { order: "asc" } });
        for (const lesson of lessons) {
          await ctx.db.lesson.create({
            data: {
              courseId: copy.id,
              moduleId: newModule.id,
              title: lesson.title,
              order: lesson.order,
              contentType: lesson.contentType,
              body: lesson.body,
              assetId: lesson.assetId,
              url: lesson.url,
              estimatedMinutes: lesson.estimatedMinutes,
              scormStatus: lesson.scormStatus,
            },
          });
        }
      }
      return copy;
    }),

  delete: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const enrolledCount = await ctx.db.enrollment.count({ where: { courseId: input.courseId } });
      if (enrolledCount > 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "People are enrolled in this course. Archive it instead of deleting." });
      }
      await ctx.db.course.delete({ where: { id: input.courseId } });
      return { ok: true };
    }),

  createModule: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const order = await ctx.db.courseModule.count({ where: { courseId: input.courseId } });
      return ctx.db.courseModule.create({ data: { courseId: input.courseId, title: input.title.trim(), order } });
    }),

  renameModule: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string(), moduleId: z.string(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // `CourseModule` has no orgId of its own — this confirms the module's
      // parent course belongs to the caller's org (and that the module
      // actually belongs to *that* course) before touching it.
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const mod = await ctx.db.courseModule.findFirst({ where: { id: input.moduleId, courseId: input.courseId } });
      if (!mod) throw new TRPCError({ code: "NOT_FOUND", message: "Module not found." });
      return ctx.db.courseModule.update({ where: { id: input.moduleId }, data: { title: input.title.trim() } });
    }),

  deleteModule: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string(), moduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      await ctx.db.courseModule.deleteMany({ where: { id: input.moduleId, courseId: input.courseId } });
      return { ok: true };
    }),

  createLesson: requirePermission("courses", "edit")
    .input(
      z.object({
        courseId: z.string(),
        moduleId: z.string(),
        title: z.string().min(1),
        contentType: z.enum(["text", "video", "file", "link", "scorm"]),
        body: z.string().optional(),
        assetId: z.string().optional(),
        url: z.string().optional(),
        estimatedMinutes: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const mod = await ctx.db.courseModule.findFirst({ where: { id: input.moduleId, courseId: input.courseId } });
      if (!mod) throw new TRPCError({ code: "NOT_FOUND", message: "Module not found." });

      // A scorm asset picked from the Content Library may already be a
      // previously-extracted, reused package (the whole point of "upload
      // once, reuse across courses") — only mark this lesson "processing"
      // if it genuinely isn't ready yet, or a reused package would falsely
      // show "still processing" forever despite already being playable.
      let scormStatus: "processing" | "ready" | undefined;
      if (input.contentType === "scorm") {
        const asset = input.assetId ? await ctx.db.asset.findUnique({ where: { id: input.assetId } }) : null;
        scormStatus = asset?.scormLaunchPath ? "ready" : "processing";
      }

      const order = await ctx.db.lesson.count({ where: { moduleId: input.moduleId } });
      return ctx.db.lesson.create({
        data: {
          courseId: input.courseId,
          moduleId: input.moduleId,
          title: input.title.trim(),
          order,
          contentType: input.contentType,
          body: input.body,
          assetId: input.assetId,
          url: input.url,
          estimatedMinutes: input.estimatedMinutes,
          scormStatus,
        },
      });
    }),

  updateLesson: requirePermission("courses", "edit")
    .input(
      z.object({
        courseId: z.string(),
        lessonId: z.string(),
        title: z.string().min(1).optional(),
        body: z.string().optional(),
        assetId: z.string().nullable().optional(),
        url: z.string().nullable().optional(),
        estimatedMinutes: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input: { courseId, lessonId, ...patch } }) => {
      const course = await ctx.db.course.findUnique({ where: { id: courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const lesson = await ctx.db.lesson.findFirst({ where: { id: lessonId, courseId } });
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });
      return ctx.db.lesson.update({ where: { id: lessonId }, data: patch });
    }),

  deleteLesson: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string(), lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      await ctx.db.lesson.deleteMany({ where: { id: input.lessonId, courseId: input.courseId } });
      return { ok: true };
    }),

  moveLesson: requirePermission("courses", "edit")
    .input(z.object({ courseId: z.string(), lessonId: z.string(), direction: z.enum(["up", "down"]) }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const lesson = await ctx.db.lesson.findFirst({ where: { id: input.lessonId, courseId: input.courseId } });
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });

      const siblings = await ctx.db.lesson.findMany({ where: { moduleId: lesson.moduleId }, orderBy: { order: "asc" } });
      const index = siblings.findIndex((l) => l.id === input.lessonId);
      const targetIndex = input.direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= siblings.length) return { ok: true };

      const a = siblings[index];
      const b = siblings[targetIndex];
      await ctx.db.$transaction([
        ctx.db.lesson.update({ where: { id: a.id }, data: { order: b.order } }),
        ctx.db.lesson.update({ where: { id: b.id }, data: { order: a.order } }),
      ]);
      return { ok: true };
    }),

  // There is deliberately no more `enroll`/`listEnrollmentRequests`/
  // `decideEnrollmentRequest` — self-service enrollment is gone entirely.
  // Access is a grant a platform admin creates (`platform.grantCourseAccess`
  // in `routers/platform.ts`), never something a learner can request. The
  // old `visibility`/`enrollmentMode` fields that used to gate that
  // self-service flow are gone from the schema entirely for the same reason.

  setLessonComplete: protectedProcedure
    .input(z.object({ enrollmentId: z.string(), lessonId: z.string(), complete: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // `Enrollment` has no orgId of its own — this confirms it belongs to
      // the caller (not just "some enrollment") before touching it. The
      // course itself now lives in the platform org, not the caller's own,
      // so it's read via `rawDb` once the grant above has already proven
      // this caller is allowed to touch it.
      const enrollment = await ctx.rawDb.enrollment.findFirst({ where: { id: input.enrollmentId, userId: ctx.session.userId } });
      if (!enrollment) throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment not found." });
      const course = await ctx.rawDb.course.findUnique({ where: { id: enrollment.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

      // A video lesson can't be forced complete without actually watching
      // it — there is no "Mark complete" button for video anymore
      // (removed per client request: a learner must not be able to scrub
      // to the end and finish). This re-checks server-side against
      // `VideoProgress`, not just the frontend's own seek-blocking, which
      // a technical user could bypass by calling this mutation directly.
      // 1.5s tolerance for rounding/buffering around the true end.
      if (input.complete) {
        const lesson = await ctx.rawDb.lesson.findUnique({ where: { id: input.lessonId } });
        if (lesson?.contentType === "video") {
          const progress = await ctx.rawDb.videoProgress.findUnique({
            where: { userId_lessonId: { userId: ctx.session.userId, lessonId: input.lessonId } },
          });
          if (!progress?.durationSeconds || progress.furthestSeconds < progress.durationSeconds - 1.5) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Watch the video to the end before completing this lesson." });
          }
        }
      }

      const completedLessonIds = input.complete
        ? [...new Set([...enrollment.completedLessonIds, input.lessonId])]
        : enrollment.completedLessonIds.filter((id) => id !== input.lessonId);

      const total = await ctx.rawDb.lesson.count({ where: { courseId: enrollment.courseId } });
      const allDone = total > 0 && completedLessonIds.length >= total;
      const wasAlreadyComplete = enrollment.status === "completed";

      await ctx.rawDb.enrollment.update({
        where: { id: input.enrollmentId },
        data: { completedLessonIds, status: allDone ? "completed" : "active", completedAt: allDone ? new Date() : null },
      });

      if (!allDone || wasAlreadyComplete) return { courseCompleted: allDone as boolean, certificateId: undefined as string | undefined };

      // The issued certificate belongs to the LEARNER's own org (so their
      // own company's reports/manager can see it) even though its
      // `templateId` cross-references a `CertificateTemplate` that lives in
      // the platform org — `issueCertificate` never validates that FK
      // against `db`, it's a plain reference, so this is safe as-is. `ctx.db`
      // here is correct (not `rawDb`): the write must land in the caller's
      // own tenant.
      //
      // If the course has a qualifying assignment, finishing every lesson
      // alone isn't enough — the certificate waits until that assignment is
      // also graded at or above its passing score (checked the other way
      // round in `assignments.ts`'s `grade`, for whichever order the two
      // actually happen in).
      let certificateId: string | undefined;
      if (course.certificateTemplateId && (await qualifyingAssignmentPassed(ctx.rawDb, course.id, ctx.session.userId))) {
        const certificate = await issueCertificate(ctx.db, {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          templateId: course.certificateTemplateId,
          sourceKind: "course",
          sourceId: course.id,
          sourceTitle: course.title,
        });
        certificateId = certificate.id;
      }

      // Course completion can also finish a Learning Path this user is on —
      // check and settle that here, mirroring the certificate issuance above.
      // `LearningPath` lives in the platform org, not necessarily the
      // caller's own — `ctx.rawDb`, same reasoning as everywhere else this
      // pass (see `paths.ts`'s own doc comment on `settlePathCompletion`).
      const pathCompletion = await settlePathCompletion(ctx.rawDb, ctx.session.orgId, ctx.session.userId, course.id);

      return { courseCompleted: true, certificateId, pathCompletion };
    }),

  /**
   * The actual anti-cheat record: how far this learner has genuinely
   * played into a video, called periodically by the player as it plays
   * (not just once at the end). `furthestSeconds` only ever grows — a
   * lower report (e.g. after a rewind) never overwrites a higher one — so
   * scrubbing backward and forward again can't erase real progress
   * already made. `setLessonComplete` reads this row back to decide
   * whether a video lesson is actually allowed to complete.
   */
  reportVideoProgress: protectedProcedure
    .input(z.object({ lessonId: z.string(), currentTime: z.number().min(0), duration: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await ctx.rawDb.lesson.findUnique({ where: { id: input.lessonId } });
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });

      const enrollment = await ctx.rawDb.enrollment.findUnique({
        where: { courseId_userId: { courseId: lesson.courseId, userId: ctx.session.userId } },
      });
      if (!enrollment || enrollment.status === "requested") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled in this course." });
      }

      const existing = await ctx.rawDb.videoProgress.findUnique({
        where: { userId_lessonId: { userId: ctx.session.userId, lessonId: input.lessonId } },
      });
      await ctx.rawDb.videoProgress.upsert({
        where: { userId_lessonId: { userId: ctx.session.userId, lessonId: input.lessonId } },
        create: { userId: ctx.session.userId, lessonId: input.lessonId, furthestSeconds: input.currentTime, durationSeconds: input.duration },
        update: { furthestSeconds: Math.max(existing?.furthestSeconds ?? 0, input.currentTime), durationSeconds: input.duration },
      });
      return { ok: true };
    }),

  /** Resume point for the seek-blocking scrubber — the furthest this
   * learner has already watched, so reopening a video mid-course doesn't
   * reset the boundary back to zero. */
  getVideoProgress: protectedProcedure.input(z.object({ lessonId: z.string() })).query(async ({ ctx, input }) => {
    const progress = await ctx.rawDb.videoProgress.findUnique({
      where: { userId_lessonId: { userId: ctx.session.userId, lessonId: input.lessonId } },
    });
    return { furthestSeconds: progress?.furthestSeconds ?? 0, durationSeconds: progress?.durationSeconds ?? null };
  }),
});
