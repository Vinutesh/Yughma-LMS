import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "yughma-backend/dist/db.js";
import { scopedPrisma } from "yughma-backend/dist/trpc/tenantScope.js";
import { appRouter } from "yughma-backend/dist/routers/_app.js";

/**
 * Receives progress reports from the SCORM API shim (see
 * backend/src/scorm/shim.ts) running inside the sandboxed package iframe —
 * a plain `fetch()` POST, not a tRPC call, since the shim has no access to
 * this app's tRPC client setup or the learner's real session (deliberately
 * — see ScormPlayer.tsx). The launch token is this request's entire
 * authority: it can only ever affect the one (user, lesson) pair it was
 * issued for for at launch time, never anything wider.
 *
 * On a completing status, this reuses `courses.setLessonComplete` (via
 * `appRouter.createCaller`, same technique the test suite uses) rather than
 * reimplementing completion — so a SCORM lesson finishing triggers the
 * exact same course-completion, certificate-issuance, and learning-path
 * settlement logic a normal lesson does, instead of a parallel SCORM-only
 * progress system nothing else in the app knows about.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const launchToken = await rawPrisma.scormLaunchToken.findUnique({ where: { token } });
  if (!launchToken || launchToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "This link has expired — reopen the lesson." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const lessonStatus = typeof body.lessonStatus === "string" ? body.lessonStatus : "incomplete";

  const [user, lesson] = await Promise.all([
    rawPrisma.user.findUnique({ where: { id: launchToken.userId }, include: { roles: true } }),
    rawPrisma.lesson.findUnique({ where: { id: launchToken.lessonId } }),
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
