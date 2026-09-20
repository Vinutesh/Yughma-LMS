import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "yughma-backend/dist/db.js";
import { scopedPrisma } from "yughma-backend/dist/trpc/tenantScope.js";
import { appRouter } from "yughma-backend/dist/routers/_app.js";
import { settleAssignmentGrade } from "yughma-backend/dist/routers/assignments.js";

/**
 * Receives progress reports from the SCORM API shim (see
 * backend/src/scorm/shim.ts) running inside the sandboxed package iframe —
 * a plain `fetch()` POST, not a tRPC call, since the shim has no access to
 * this app's tRPC client setup or the learner's real session (deliberately
 * — see ScormPlayer.tsx). The launch token is this request's entire
 * authority: it can only ever affect the one (user, lesson-or-assignment)
 * pair it was issued for at launch time, never anything wider.
 *
 * Branches on which of `lessonId`/`assignmentId` the token carries (see
 * `ScormLaunchToken`'s own doc comment: exactly one is ever set).
 *
 * Lesson completion reuses `courses.setLessonComplete` (via
 * `appRouter.createCaller`, same technique the test suite uses) rather than
 * reimplementing it, so a SCORM lesson finishing triggers the exact same
 * course-completion, certificate-issuance, and learning-path settlement
 * logic a normal lesson does.
 *
 * Assignment completion writes the `Submission` row directly rather than
 * calling `assignments.grade` — that mutation requires `courses:edit`,
 * which the learner (the only real identity this request has) never holds,
 * and impersonating a staff member here would be worse than not reusing
 * the procedure. `settleAssignmentGrade` (the qualifying-assignment
 * certificate check `grade` itself calls) is reused directly instead, so a
 * SCORM-reported passing score unlocks a certificate exactly like a
 * human-entered one does.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const launchToken = await rawPrisma.scormLaunchToken.findUnique({ where: { token } });
  if (!launchToken || launchToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "This link has expired — reopen the page." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const lessonStatus = typeof body.lessonStatus === "string" ? body.lessonStatus : "incomplete";
  const scoreRaw = typeof body.scoreRaw === "number" && Number.isFinite(body.scoreRaw) ? body.scoreRaw : null;
  const completed = lessonStatus === "completed" || lessonStatus === "passed";

  if (launchToken.assignmentId) {
    const assignment = await rawPrisma.assignment.findUnique({ where: { id: launchToken.assignmentId } });
    if (!assignment) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const enrollment = await rawPrisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: assignment.courseId, userId: launchToken.userId } },
    });
    if (!enrollment || enrollment.status === "requested") {
      return NextResponse.json({ error: "Not enrolled." }, { status: 403 });
    }
    if (!completed) return NextResponse.json({ ok: true });

    // SCORM's raw score is conventionally 0-100 regardless of the
    // assignment's own points scale — convert onto that scale so it reads
    // the same way a human-entered grade would (and so the qualifying-
    // assignment percent check below is comparing like with like).
    const score =
      scoreRaw === null ? null : Math.max(0, Math.min(assignment.pointsPossible, Math.round((scoreRaw / 100) * assignment.pointsPossible)));

    const existing = await rawPrisma.submission.findFirst({
      where: { assignmentId: assignment.id, userId: launchToken.userId },
    });
    // A staff member's own manual grade always wins — a later SCORM replay
    // (e.g. the learner reopening a finished package) must never silently
    // overwrite a human's decision.
    if (existing?.gradedByUserId) return NextResponse.json({ ok: true });

    if (existing) {
      await rawPrisma.submission.update({
        where: { id: existing.id },
        data: {
          submittedAt: new Date(),
          score: score ?? existing.score,
          gradedAt: score !== null ? new Date() : existing.gradedAt,
        },
      });
    } else {
      await rawPrisma.submission.create({
        data: {
          assignmentId: assignment.id,
          userId: launchToken.userId,
          submittedAt: new Date(),
          score: score ?? undefined,
          gradedAt: score !== null ? new Date() : undefined,
          flagged: false,
        },
      });
    }

    if (score !== null) {
      await settleAssignmentGrade(rawPrisma, assignment, launchToken.userId, score);
    }
    return NextResponse.json({ ok: true });
  }

  const [user, lesson] = await Promise.all([
    rawPrisma.user.findUnique({ where: { id: launchToken.userId }, include: { roles: true } }),
    rawPrisma.lesson.findUnique({ where: { id: launchToken.lessonId! } }),
  ]);
  if (!user || !lesson) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const enrollment = await rawPrisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: lesson.courseId, userId: user.id } },
  });
  if (!enrollment || enrollment.status === "requested") {
    return NextResponse.json({ error: "Not enrolled." }, { status: 403 });
  }

  if (completed) {
    const ctx = {
      session: { userId: user.id, orgId: user.orgId, roleIds: user.roles.map((r: { roleId: string }) => r.roleId) },
      db: scopedPrisma(user.orgId),
      rawDb: rawPrisma,
    };
    const caller = appRouter.createCaller(ctx);
    await caller.courses.setLessonComplete({ enrollmentId: enrollment.id, lessonId: lesson.id, complete: true });
  }

  return NextResponse.json({ ok: true });
}
