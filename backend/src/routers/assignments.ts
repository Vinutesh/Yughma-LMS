import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";
import type { rawPrisma } from "../db.js";
import { issueCertificate } from "./certificates.js";
import { resolvePlaybackUrl } from "./content.js";

type RawDb = typeof rawPrisma;

/**
 * Mirrors `frontend/src/lib/api/resources/assignments.ts`. `Assignment` is
 * directly tenant-scoped and now lives in the platform org, not the
 * caller's own — manage-side resolvers (create/update/delete/setFlag/...)
 * keep using `ctx.db`, scoped to the caller, since only platform staff ever
 * reach them (`requirePermission("courses", ...)`). Learner-facing resolvers
 * (`get`/`getMySubmission`/`submit`/`mine`) use `ctx.rawDb` instead,
 * deliberately crossing that boundary, but only after an `Enrollment` row
 * (a grant a platform admin created — see `routers/platform.ts` — never
 * self-service) proves this caller has access. `Submission` is unscoped
 * either way (no `orgId` of its own — see tenantScope.ts) — every resolver
 * that touches one by an id from the request first resolves its parent
 * `Assignment`, using the now-verified assignment's id, same pattern
 * `courses.ts` established for `Lesson`/`Enrollment`.
 *
 * The mock's `notify(...)` calls on grading are dropped — the notifications
 * router doesn't exist yet on the real backend (same documented gap as
 * `users.ts`'s dropped audit/notify side effects). Not an oversight.
 */

async function summarize(db: RawDb, assignment: Awaited<ReturnType<ScopedDb["assignment"]["findFirstOrThrow"]>>) {
  const [course, submissions] = await Promise.all([
    db.course.findUnique({ where: { id: assignment.courseId }, select: { title: true } }),
    db.submission.findMany({ where: { assignmentId: assignment.id } }),
  ]);
  return {
    ...assignment,
    courseTitle: course?.title ?? "Unknown course",
    submissionCount: submissions.length,
    ungradedCount: submissions.filter((s) => s.passed === null).length,
  };
}

/**
 * Resolves a submission by id the same way `roles.ts`/`users.ts` resolve a
 * join-table row: `Submission` carries no `orgId`, so `ctx.db.submission` is
 * never automatically org-filtered. Looking its parent `Assignment` up
 * through `ctx.db` (which returns null for a cross-org id) is what actually
 * confirms the submission belongs to the caller's org — returns null rather
 * than throwing so callers can 404 without confirming a cross-org row exists.
 */
async function resolveSubmission(db: ScopedDb, submissionId: string) {
  const submission = await db.submission.findUnique({ where: { id: submissionId } });
  if (!submission) return null;
  const assignment = await db.assignment.findUnique({ where: { id: submission.assignmentId } });
  if (!assignment) return null;
  return { submission, assignment };
}

/** Same pattern as `calendar.ts`/`communities.ts`/`courses.ts`: re-derived
 * from the caller's own roles, never trusted as a request argument. */
async function hasEditPermission(db: ScopedDb, roleIds: string[]): Promise<boolean> {
  const roles = await db.role.findMany({ where: { id: { in: roleIds } }, include: { permissions: true } });
  const rank = { view: 1, edit: 2, manage: 3 } as const;
  return roles.some((role) =>
    role.permissions.some((p) => p.resource === "courses" && rank[p.action as keyof typeof rank] >= rank.edit),
  );
}

/**
 * A qualifying assignment reporting a real pass can be what finally unlocks
 * the learner's certificate — they may well have finished every lesson
 * already and just been waiting on this outcome. Only fires on an actual
 * pass AND once the course itself is otherwise done; `issueCertificate` is
 * idempotent, so calling this again for someone who already passed (and was
 * already issued a certificate) is a harmless no-op.
 *
 * Takes a plain `passed: boolean`, not a score — a SCORM assessment package
 * can be configured with its own internal passing threshold and simply
 * never report success below it (`cmi.core.lesson_status` of "failed"
 * rather than "passed"), so comparing a raw score against
 * `Assignment.passingScorePercent` here would be redundant with, and could
 * disagree with, a decision the package already made itself. There is no
 * manual grading anymore for this to also serve — the SCORM progress
 * webhook (`frontend/src/app/api/scorm/[token]/progress/route.ts`) is the
 * only caller.
 */
export async function settleAssignmentGrade(
  rawDb: RawDb,
  assignment: { courseId: string; isQualifying: boolean },
  learnerUserId: string,
  passed: boolean,
): Promise<void> {
  if (!assignment.isQualifying || !passed) return;

  const [course, enrollment] = await Promise.all([
    rawDb.course.findUnique({ where: { id: assignment.courseId } }),
    rawDb.enrollment.findUnique({
      where: { courseId_userId: { courseId: assignment.courseId, userId: learnerUserId } },
    }),
  ]);
  if (!course?.certificateTemplateId || enrollment?.status !== "completed") return;

  // The learner is in their own client org, not necessarily the caller's —
  // `rawDb` and the learner's own `orgId`, same cross-org pattern as
  // `platform.ts`'s `grantCourseAccess`.
  const learner = await rawDb.user.findUnique({ where: { id: learnerUserId } });
  if (!learner) return;

  await issueCertificate(rawDb, {
    orgId: learner.orgId,
    userId: learner.id,
    templateId: course.certificateTemplateId,
    sourceKind: "course",
    sourceId: course.id,
    sourceTitle: course.title,
  });
}

export const assignmentsRouter = router({
  list: requirePermission("courses", "view").query(async ({ ctx }) => {
    const assignments = await ctx.db.assignment.findMany({ orderBy: { createdAt: "desc" } });
    return Promise.all(assignments.map((a) => summarize(ctx.rawDb, a)));
  }),

  /**
   * Without the enrollment check, a learner could read another course's
   * assignment instructions and due date by guessing/enumerating ids,
   * despite never seeing that course in their catalog. This used to be
   * gated behind a client-supplied `learnerContext` boolean — any caller
   * could omit it to skip the check entirely, since the request itself
   * decided whether the request was trustworthy. Now always enforced,
   * bypassed only for callers who actually hold `courses:edit` (the manage
   * queue), derived server-side from the session's own roles.
   */
  get: protectedProcedure.input(z.object({ assignmentId: z.string() })).query(async ({ ctx, input }) => {
    // `Assignment` now lives in the platform org — `ctx.rawDb` here,
    // deliberately, with `hasEditPermission`/the enrollment check below as
    // the actual access decision (both still correct scoped to the
    // caller's own org/identity).
    const assignment = await ctx.rawDb.assignment.findUnique({ where: { id: input.assignmentId } });
    if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });

    if (!(await hasEditPermission(ctx.db, ctx.session.roleIds))) {
      const enrollment = await ctx.rawDb.enrollment.findUnique({
        where: { courseId_userId: { courseId: assignment.courseId, userId: ctx.session.userId } },
      });
      if (!enrollment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });
    }

    return summarize(ctx.rawDb, assignment);
  }),

  /** The signed download URL for the admin-uploaded test/assignment
   * document itself (`Assignment.assetId`) — distinct from a learner's own
   * submission file. Same access rule as `get` above: platform staff with
   * `courses:edit`, or a learner enrolled in the assignment's course.
   * Includes the asset's `kind` so the frontend can render a SCORM package
   * inline (via `ScormPlayer`) instead of a plain download link — the same
   * distinction `Lesson.contentType` already draws for lessons, just read
   * off the asset itself since `Assignment` has no `contentType` field. */
  getAssignmentAssetUrl: protectedProcedure
    .input(z.object({ assignmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignment = await ctx.rawDb.assignment.findUnique({ where: { id: input.assignmentId } });
      if (!assignment || !assignment.assetId) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });

      if (!(await hasEditPermission(ctx.db, ctx.session.roleIds))) {
        const enrollment = await ctx.rawDb.enrollment.findUnique({
          where: { courseId_userId: { courseId: assignment.courseId, userId: ctx.session.userId } },
        });
        if (!enrollment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });
      }

      const asset = await ctx.rawDb.asset.findUnique({ where: { id: assignment.assetId } });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Attached file not found." });

      return { name: asset.name, kind: asset.kind, url: await resolvePlaybackUrl(asset.storageKey) };
    }),

  create: requirePermission("courses", "edit")
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().max(200),
        instructions: z.string().max(20_000),
        dueAt: z.coerce.date().optional(),
        submissionType: z.enum(["text", "file", "both"]),
        pointsPossible: z.number().int().max(100_000),
        isQualifying: z.boolean().optional(),
        passingScorePercent: z.number().int().min(1).max(100).optional(),
        /** The uploaded test/assignment document itself, picked from the
         * Content Library (the same picker + upload flow lesson files use) —
         * distinct from what the learner later submits back. */
        assetId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.title.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Assignment title is required." });
      if (input.pointsPossible <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Points possible must be greater than zero." });
      }
      const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

      if (input.assetId) {
        const asset = await ctx.db.asset.findUnique({ where: { id: input.assetId } });
        if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Attached file not found." });
      }

      // At most one qualifying assignment per course — making a new one the
      // qualifying assignment demotes whichever one held that spot before,
      // rather than leaving two assignments both claiming to gate the same
      // certificate.
      if (input.isQualifying) {
        await ctx.db.assignment.updateMany({ where: { courseId: input.courseId, isQualifying: true }, data: { isQualifying: false } });
      }

      return ctx.db.assignment.create({
        data: {
          orgId: ctx.session.orgId,
          courseId: input.courseId,
          title: input.title.trim(),
          instructions: input.instructions,
          assetId: input.assetId,
          dueAt: input.dueAt,
          submissionType: input.submissionType,
          pointsPossible: input.pointsPossible,
          isQualifying: input.isQualifying ?? false,
          passingScorePercent: input.passingScorePercent ?? 85,
          createdByUserId: ctx.session.userId,
        },
      });
    }),

  update: requirePermission("courses", "edit")
    .input(
      z.object({
        assignmentId: z.string(),
        title: z.string().max(200).optional(),
        instructions: z.string().max(20_000).optional(),
        dueAt: z.coerce.date().nullable().optional(),
        submissionType: z.enum(["text", "file", "both"]).optional(),
        pointsPossible: z.number().int().max(100_000).optional(),
        isQualifying: z.boolean().optional(),
        passingScorePercent: z.number().int().min(1).max(100).optional(),
        assetId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input: { assignmentId, ...patch } }) => {
      if (patch.title !== undefined && !patch.title.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Assignment title is required." });
      }
      if (patch.pointsPossible !== undefined && patch.pointsPossible <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Points possible must be greater than zero." });
      }
      const assignment = await ctx.db.assignment.findUnique({ where: { id: assignmentId } });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });

      if (patch.assetId) {
        const asset = await ctx.db.asset.findUnique({ where: { id: patch.assetId } });
        if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Attached file not found." });
      }

      if (patch.isQualifying) {
        await ctx.db.assignment.updateMany({
          where: { courseId: assignment.courseId, isQualifying: true, id: { not: assignmentId } },
          data: { isQualifying: false },
        });
      }

      return ctx.db.assignment.update({
        where: { id: assignmentId },
        data: { ...patch, title: patch.title?.trim() },
      });
    }),

  delete: requirePermission("courses", "edit")
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({ where: { id: input.assignmentId } });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });

      // Deletable regardless of existing submissions, per explicit client
      // request — `Submission.assignment` is already `onDelete: Cascade` in
      // the schema, so this removes them along with it rather than needing
      // to delete them first. This used to refuse outright ("People have
      // already submitted to this assignment. It can't be deleted.") the
      // moment even one submission existed, with no way past it short of
      // deleting each submission individually first.
      await ctx.db.assignment.delete({ where: { id: input.assignmentId } });
      return { ok: true };
    }),

  listSubmissions: requirePermission("courses", "view")
    .input(z.object({ assignmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({ where: { id: input.assignmentId } });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });

      const [submissions, users] = await Promise.all([
        ctx.db.submission.findMany({ where: { assignmentId: input.assignmentId } }),
        // `ctx.db` is scoped to the *caller's* org (always the platform
        // org, since only its staff hold `courses:view`) — every real
        // submission comes from a learner in a client org, so that scoped
        // lookup could never find any of them and this always fell back to
        // "Unknown". `rawDb`, deliberately crossing that boundary, the same
        // way `platform.ts`'s cross-org reads already do.
        ctx.rawDb.user.findMany({ select: { id: true, name: true } }),
      ]);
      const userName = new Map(users.map((u) => [u.id, u.name]));
      return submissions.map((s) => ({
        ...s,
        learnerName: userName.get(s.userId) ?? "Unknown",
        late: !!assignment.dueAt && s.submittedAt > assignment.dueAt,
      }));
    }),

  /** The caller's own submission for an assignment, or null. */
  getMySubmission: protectedProcedure.input(z.object({ assignmentId: z.string() })).query(async ({ ctx, input }) => {
    const assignment = await ctx.rawDb.assignment.findUnique({ where: { id: input.assignmentId } });
    if (!assignment) return null;
    return ctx.rawDb.submission.findFirst({ where: { assignmentId: input.assignmentId, userId: ctx.session.userId } });
  }),

  submit: protectedProcedure
    .input(z.object({ assignmentId: z.string(), text: z.string().optional(), assetId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.rawDb.assignment.findUnique({ where: { id: input.assignmentId } });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });

      // Without this, ANY authenticated user (any client company, any
      // role) could submit to ANY assignment by id — before `Assignment`
      // moved into the platform org, the tenant-scoped lookup above
      // accidentally provided this boundary as a side effect; now that the
      // lookup is deliberately unscoped (`rawDb`), enrollment has to be the
      // real, explicit check instead of an implicit one.
      const enrollment = await ctx.rawDb.enrollment.findUnique({
        where: { courseId_userId: { courseId: assignment.courseId, userId: ctx.session.userId } },
      });
      if (!enrollment || enrollment.status === "requested") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled in this course." });
      }

      const existing = await ctx.rawDb.submission.findFirst({
        where: { assignmentId: input.assignmentId, userId: ctx.session.userId },
      });
      if (existing?.score !== null && existing?.score !== undefined) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This has already been graded and can't be resubmitted." });
      }

      const needsText = assignment.submissionType !== "file";
      if (needsText && !input.text?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Write a response before submitting." });
      }
      if (assignment.submissionType === "file" && !input.assetId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Attach a file before submitting." });
      }

      if (existing) {
        return ctx.rawDb.submission.update({
          where: { id: existing.id },
          data: { text: input.text, assetId: input.assetId, submittedAt: new Date() },
        });
      }
      return ctx.rawDb.submission.create({
        data: {
          assignmentId: input.assignmentId,
          userId: ctx.session.userId,
          text: input.text,
          assetId: input.assetId,
          flagged: false,
        },
      });
    }),

  // There is deliberately no more `grade` mutation — a submission's score
  // now only ever comes from `settleAssignmentGrade`, called from the SCORM
  // progress webhook once the assessment package itself reports how the
  // learner did. Nobody reviews or types in a score by hand: the whole
  // point of an assessment package is that it grades itself, and a human
  // "grading" step on top of that was pure friction that also risked
  // disagreeing with the certificate the same score already unlocked.

  setFlag: requirePermission("courses", "edit")
    .input(z.object({ submissionId: z.string(), flagged: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolveSubmission(ctx.db, input.submissionId);
      if (!resolved) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found." });
      return ctx.db.submission.update({ where: { id: input.submissionId }, data: { flagged: input.flagged } });
    }),

  /** Permanent — removes a learner's submitted response entirely (their
   * text/file, and any score/feedback already given). Same `courses:edit`
   * gate as grading, since only platform staff ever hold it. */
  deleteSubmission: requirePermission("courses", "edit")
    .input(z.object({ submissionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolveSubmission(ctx.db, input.submissionId);
      if (!resolved) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found." });
      await ctx.db.submission.delete({ where: { id: input.submissionId } });
      return { ok: true };
    }),

  /** Assignments across every course the learner is actively enrolled in. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const enrollments = await ctx.rawDb.enrollment.findMany({
      where: { userId: ctx.session.userId, status: { not: "requested" } },
    });
    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const assignments = await ctx.rawDb.assignment.findMany({ where: { courseId: { in: courseIds } } });
    return Promise.all(
      assignments.map(async (a) => ({
        ...(await summarize(ctx.rawDb, a)),
        submission: await ctx.rawDb.submission.findFirst({ where: { assignmentId: a.id, userId: ctx.session.userId } }),
      })),
    );
  }),
});
