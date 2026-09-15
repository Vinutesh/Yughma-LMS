import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "yughma-backend/dist/db.js";
import { getObjectBuffer } from "yughma-backend/dist/storage/r2.js";
import { contentTypeFor } from "yughma-backend/dist/scorm/extract.js";
import { buildScormShimScript } from "yughma-backend/dist/scorm/shim.js";

/**
 * Serves an extracted SCORM package's files — the launch page (dynamically,
 * with the progress-tracking shim injected and this learner's real current
 * state inlined) plus every other file the package references by relative
 * path (static passthrough from R2). One route handles both: an empty
 * `path` means "serve the manifest-declared launch file"; anything else is
 * a sub-resource the launch page's own HTML/JS/CSS asked for by path.
 *
 * Auth model: the token in the URL is the sole credential, minted once by
 * `scorm.getLaunchUrl` after a real enrollment check — not re-checked per
 * sub-resource request, since by the time a browser is requesting
 * "js/app.js" it already legitimately loaded the (enrollment-gated) launch
 * page that pointed it there. See ScormLaunchToken's own doc comment in
 * schema.prisma for why this token, and not the learner's real session, is
 * what untrusted package JS ever gets handed.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string; path?: string[] }> }) {
  const { token, path } = await params;

  const launchToken = await rawPrisma.scormLaunchToken.findUnique({ where: { token } });
  if (!launchToken || launchToken.expiresAt < new Date()) {
    return new NextResponse("This link has expired. Close this and reopen the lesson.", { status: 401 });
  }

  const asset = await rawPrisma.asset.findUnique({ where: { id: launchToken.assetId } });
  if (!asset || !asset.scormLaunchPath) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const isLaunch = !path || path.length === 0;
  const relativePath = isLaunch ? asset.scormLaunchPath : path.join("/");
  const storageKey = `${asset.orgId}/scorm/${asset.id}/${relativePath}`;

  let data: Buffer;
  try {
    data = await getObjectBuffer(storageKey);
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }

  if (!isLaunch) {
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": contentTypeFor(relativePath), "Cache-Control": "private, max-age=3600" },
    });
  }

  // Launch page only: inline this learner's real current progress so the
  // shim's first GetValue calls (which the SCORM spec requires to be
  // synchronous) read real data, not empty defaults — see shim.ts's own
  // doc comment on why this can't just be an async fetch from the shim
  // itself.
  const lesson = await rawPrisma.lesson.findUnique({ where: { id: launchToken.lessonId } });
  const enrollment = lesson
    ? await rawPrisma.enrollment.findUnique({
        where: { courseId_userId: { courseId: lesson.courseId, userId: launchToken.userId } },
      })
    : null;
  const alreadyDone = !!enrollment && lesson ? enrollment.completedLessonIds.includes(lesson.id) : false;

  const shim = buildScormShimScript({
    token,
    progressUrl: `/api/scorm/${token}/progress`,
    initial: { lessonStatus: alreadyDone ? "completed" : "incomplete", scoreRaw: null, suspendData: "" },
  });

  // Next.js redirects "/api/scorm/<token>/" (no sub-path) to
  // "/api/scorm/<token>" (strips the trailing slash) before this handler
  // ever runs — harmless for the request itself, but it means the
  // document's own URL has no trailing slash either. Every *relative*
  // reference inside the package's own HTML/CSS ("style.css",
  // "js/app.js") would then resolve one level too high (replacing the
  // token itself instead of a path segment under it). An explicit <base>
  // fixes this regardless of what the actual request URL looked like —
  // the standard tool for exactly this problem, not a workaround for a
  // Next.js quirk specifically.
  const baseTag = `<base href="/api/scorm/${token}/">`;
  let html = data.toString("utf-8");
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => `${match}\n${baseTag}\n${shim}`);
  } else {
    html = `${baseTag}\n${shim}\n${html}`;
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
