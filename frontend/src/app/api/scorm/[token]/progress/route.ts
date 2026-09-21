import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "yughma-backend/dist/db.js";
import { scopedPrisma } from "yughma-backend/dist/trpc/tenantScope.js";
import { appRouter } from "yughma-backend/dist/routers/_app.js";
import { settleAssignmentGrade } from "yughma-backend/dist/routers/assignments.js";

/**
 * Persists the actual SCORM "bookmark" (`cmi.suspend_data`) on every report,
 * not just at completion — a package updates this throughout a session
 * (which slide/question it's on), and only saving it once at the end would
 * lose everything if the learner closes the tab mid-way. Exactly one of
 * `lessonId`/`assignmentId` is passed, mirroring `ScormLaunchToken`'s shape.
 * No `@@unique` exists on `ScormProgress` for this pair (see its own schema
 * comment on why one would be unsafe with nullable columns), so this does
 * the find-then-update-or-create by hand instead of a DB-level upsert.
 */
async function saveBookmark(target: { lessonId?: string; assignmentId?: string }, userId: string, suspendData: string) {
  const where = target.lessonId
    ? { userId, lessonId: target.lessonId }
    : { userId, assignmentId: target.assignmentId! };
  const existing = await rawPrisma.scormProgress.findFirst({ where });
  if (existing) {
    await rawPrisma.scormProgress.update({ where: { id: existing.id }, data: { suspendData } });
  } else {
    await rawPrisma.scormProgress.create({ data: { userId, ...target, suspendData } });
  }
}

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
 * `ScormLaunchToken`'s own doc comment: exactly one is ever set). Every
 * report — not just a final/decisive one — saves the bookmark first, before
 * either branch's own logic below runs.
 *
 * Lesson completion reuses `courses.setLessonComplete` (via
 * `appRouter.createCaller`, same technique the test suite uses) rather than
 * reimplementing it, so a SCORM lesson finishing triggers the exact same
 * course-completion, certificate-issuance, and learning-path settlement
 * logic a normal lesson does.
 *
 * Assignment outcomes write the `Submission` row directly — there is no
 * manual grading mutation to call at all anymore. This reads `lessonStatus`
 * itself, not a score: a "passed"/"completed" report is a pass, "failed" is
 * an explicit fail, and anything else (incomplete/browsed/not attempted) is
 * just a bookmark update, not a real outcome yet. A package can be
 * internally configured to require its own threshold and simply never
 * report success below it — that decision is authoritative, not a raw
 * score compared against a separately-configured percentage here.
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
  const suspendData = typeof body.suspendData === "string" ? body.suspendData : "";

  await saveBookmark(
    launchToken.lessonId ? { lessonId: launchToken.lessonId } : { assignmentId: launchToken.assignmentId! },
    launchToken.userId,
    suspendData,
  );

  if (launchToken.assignmentId) {
    const assignment = await rawPrisma.assignment.findUnique({ where: { id: launchToken.assignmentId } });
    if (!assignment) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const enrollment = await rawPrisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: assignment.courseId, userId: launchToken.userId } },
    });
    if (!enrollment || enrollment.status === "requested") {
      return NextResponse.json({ error: "Not enrolled." }, { status: 403 });
    }

    // A neutral "completed" (no pass/fail concept in this particular
    // package) still counts as a pass — there's no failure signal to
    // withhold the certificate over. "Failed" is the one genuinely negative
    // outcome; anything else is still in progress, just a bookmark update.
    const passed = lessonStatus === "passed" || lessonStatus === "completed";
    const failed = lessonStatus === "failed";
    if (!passed && !failed) return NextResponse.json({ ok: true });

    // Informational only now (see Submission.score's own schema comment) —
    // still worth recording if the package happens to report one.
    const score =
      scoreRaw === null ? null : Math.max(0, Math.min(assignment.pointsPossible, Math.round((scoreRaw / 100) * assignment.pointsPossible)));

    const existing = await rawPrisma.submission.findFirst({
      where: { assignmentId: assignment.id, userId: launchToken.userId },
    });
    // Guards against a legacy manually-graded row from before manual
    // grading was removed — nothing can set this going forward, but an
    // old row shouldn't be silently overwritten by a later replay.
    if (existing?.gradedByUserId) return NextResponse.json({ ok: true });

    if (existing) {
      await rawPrisma.submission.update({
        where: { id: existing.id },
        data: { submittedAt: new Date(), passed, score: score ?? existing.score, gradedAt: new Date() },
      });
    } else {
      await rawPrisma.submission.create({
        data: {
          assignmentId: assignment.id,
          userId: launchToken.userId,
          submittedAt: new Date(),
          passed,
          score: score ?? undefined,
          gradedAt: new Date(),
          flagged: false,
        },
      });
    }

    if (passed) {
      await settleAssignmentGrade(rawPrisma, assignment, launchToken.userId, true);
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

  const completed = lessonStatus === "completed" || lessonStatus === "passed";
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
