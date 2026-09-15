import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "yughma-backend/dist/db.js";
import { getObjectBuffer } from "yughma-backend/dist/storage/r2.js";
import { contentTypeFor } from "yughma-backend/dist/scorm/extract.js";
import { buildScormShimScript, buildStorageShimScript } from "yughma-backend/dist/scorm/shim.js";

/**
 * Serves an extracted SCORM package's files — the launch page (dynamically,
 * with the progress-tracking shim injected and this learner's real current
 * state inlined) plus every other file the package references by relative
 * path (static passthrough from R2). One route handles both, distinguished
 * by comparing the resolved relative path against the manifest's own
 * declared launch file, not by whether a sub-path was present at all — see
 * this file's own history for why "empty path = launch" broke real-world
 * packages.
 *
 * Real SCORM packages (this was found against an actual Articulate
 * Storyline export, not a hypothetical) often compute their own asset
 * paths from `window.location.pathname` directly inside their bootstrap
 * script, not from the DOM's base-URL-aware resolution — so an injected
 * `<base>` tag, which only affects the browser's own HTML-attribute/CSS
 * resolution, does nothing for that case; `location.pathname` always
 * reports the real navigated URL regardless of `<base>`. The fix is for
 * the URL itself to end in the package's real filename (e.g.
 * ".../index_lms.html"), exactly as a plain static file server would
 * serve it — then *any* path-computation strategy, browser-native or a
 * script parsing location.pathname by hand, lands on the same, correct
 * sibling directory. `scorm.getLaunchUrl` hands out exactly that shape now
 * instead of a bare token URL.
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

  // No sub-path at all still falls back to the launch file, so a bare
  // "/api/scorm/<token>" keeps working too — but scorm.getLaunchUrl no
  // longer hands out that shape by default; this is a fallback, not the
  // primary path.
  const relativePath = path && path.length > 0 ? path.join("/") : asset.scormLaunchPath;
  const isLaunch = relativePath === asset.scormLaunchPath;
  const storageKey = `${asset.orgId}/scorm/${asset.id}/${relativePath}`;

  let data: Buffer;
  try {
    data = await getObjectBuffer(storageKey);
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }

  // Sandboxed without allow-same-origin means every document served here has
  // an opaque origin, and browsers send `Origin: null` for opaque-origin
  // requests — which subjects *font* loads (unlike scripts/styles/images) to
  // real CORS enforcement, even same-site. Without this header, a package's
  // own webfont requests fail outright with net::ERR_FAILED rather than just
  // rendering unstyled — and a package (confirmed: Articulate Storyline's
  // mobile output) that gates removing its own loading spinner on those
  // fonts actually finishing loading then spins forever. `*` is safe here:
  // this endpoint serves no credentials and nothing here is
  // per-viewer-secret beyond the token already required to reach it at all.
  const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

  if (!isLaunch) {
    const contentType = contentTypeFor(relativePath);
    // Storyline packages ship more than one HTML document (e.g. its own
    // `analytics-frame.html`, loaded as a nested iframe) — each gets its own
    // opaque origin under this sandbox, so each needs the same
    // localStorage/sessionStorage shim as the launch page, or it hits the
    // same uncaught SecurityError independently. See buildStorageShimScript's
    // own doc comment for the full story.
    if (contentType === "text/html" && /<head[^>]*>/i.test(data.toString("utf-8"))) {
      const html = data
        .toString("utf-8")
        .replace(/<head[^>]*>/i, (match) => `${match}\n${buildStorageShimScript()}`);
      return new NextResponse(html, {
        headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600", ...CORS_HEADERS },
      });
    }
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600", ...CORS_HEADERS },
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

  // Still injected as defense-in-depth for packages that *do* use normal
  // browser-resolved relative URLs — harmless, just no longer the primary
  // fix, since the URL's own shape now carries the real directory context.
  const baseTag = `<base href="/api/scorm/${token}/${asset.scormLaunchPath.includes("/") ? asset.scormLaunchPath.slice(0, asset.scormLaunchPath.lastIndexOf("/") + 1) : ""}">`;
  let html = data.toString("utf-8");
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => `${match}\n${baseTag}\n${shim}`);
  } else {
    html = `${baseTag}\n${shim}\n${html}`;
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...CORS_HEADERS },
  });
}
