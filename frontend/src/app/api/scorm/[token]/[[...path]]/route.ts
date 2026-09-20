import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "yughma-backend/dist/db.js";
import { getObjectBuffer } from "yughma-backend/dist/storage/r2.js";
import { contentTypeFor } from "yughma-backend/dist/scorm/extract.js";
import { buildScormShimScript, buildStorageShimScript } from "yughma-backend/dist/scorm/shim.js";

/**
 * Serves an extracted SCORM package's files — package content (static
 * passthrough from R2, the launch file included) plus, on the isolated
 * `SCORM_CONTENT_ORIGIN` deployment, a synthetic "wrapper" document that
 * exists purely to host the SCORM API object real authoring-tool runtimes
 * expect to find on an *ancestor* frame.
 *
 * Real SCORM packages (confirmed against an actual Articulate Storyline
 * export, not a hypothetical) bundle Rustici's SCORM Driver
 * (`lms/scormdriver.js`), whose API-discovery walks `window.parent` /
 * `window.top.opener` and never checks its own window — so an API object
 * placed directly in the SCO's own document (the original design here) is
 * never found. Making that walk succeed requires the SCO's immediate
 * *parent* frame to (a) actually define the API and (b) be genuinely
 * same-origin with the SCO, which needs `allow-same-origin` on the SCO's
 * sandbox. Granting that on this app's own origin would let arbitrary
 * uploaded package JS fully script the real app (read the learner's
 * session token, cookies, everything) — so it's only ever safe to do this
 * when the whole `/api/scorm/*` tree is served from a dedicated, isolated
 * origin that holds nothing else (see `proxy.ts`), configured via
 * `SCORM_CONTENT_ORIGIN`. On that origin, the frame tree is:
 *
 *   main app (the real, trusted origin)
 *     └─ iframe, sandbox="allow-scripts allow-same-origin ...", src = the
 *        wrapper (`.../__scorm_wrapper__`) — trusted, first-party HTML,
 *        defines window.API/window.API_1484_11 via buildScormShimScript
 *        and iframes the real package underneath it
 *          └─ iframe, sandbox="allow-scripts allow-same-origin ...", src =
 *             the actual untrusted package content. Same real origin as
 *             the wrapper (both served from SCORM_CONTENT_ORIGIN), so its
 *             window.parent walk succeeds and finds the wrapper's API.
 *             The package could fully script the wrapper in return — but
 *             the wrapper holds nothing but the single-purpose launch
 *             token already handed to package content anyway, never the
 *             learner's real session, so that's an even trade.
 *
 * When `SCORM_CONTENT_ORIGIN` isn't configured, none of this applies:
 * `scorm.getLaunchUrl` hands out a direct link to the launch file on this
 * app's own origin instead of the wrapper, the launch file's own document
 * gets the API shim injected directly (the original, single-frame design),
 * and the sandbox stays `allow-scripts` only. Real authoring-tool output
 * will still show the loading spinner forever in that mode — a known,
 * deliberate limitation until the isolated origin is set up, not a
 * regression — but simpler/custom-authored SCOs that check their own
 * window first still work.
 *
 * Auth model unchanged either way: the token in the URL is the sole
 * credential, minted once by `scorm.getLaunchUrl` after a real enrollment
 * check — not re-checked per sub-resource request, since by the time a
 * browser is requesting "js/app.js" it already legitimately loaded the
 * (enrollment-gated) launch page that pointed it there. See
 * ScormLaunchToken's own doc comment in schema.prisma.
 */
const WRAPPER_SEGMENT = "__scorm_wrapper__";

// Sandboxed without allow-same-origin means every document served here has
// an opaque origin, and browsers send `Origin: null` for opaque-origin
// requests — which subjects *font* loads (unlike scripts/styles/images) to
// real CORS enforcement, even same-site. Without this header, a package's
// own webfont requests fail outright with net::ERR_FAILED rather than just
// rendering unstyled — and a package (confirmed: Articulate Storyline's
// mobile output) that gates removing its own loading spinner on those
// fonts actually finishing loading then spins forever. `*` is safe here:
// this endpoint serves no credentials and nothing here is per-viewer-secret
// beyond the token already required to reach it at all.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

/**
 * Every sub-resource a package asks for (its JS, CSS, images, audio — a
 * real Storyline export is 70+ files) costs one R2 GetObject on a cache
 * miss, so a short TTL meant re-paying that for every learner, every hour.
 * These objects are genuinely immutable: they live under
 * `{orgId}/scorm/{assetId}/`, and `assetId` is unique per upload — editing
 * a package means uploading a new one, which lands on a different prefix
 * and therefore a different URL. Nothing can change underneath this URL,
 * so it's safe to cache for a year. `private` (not `public`) is deliberate
 * even so: these URLs carry a launch token, and they must never be held in
 * a shared/proxy cache where another learner could be served one.
 */
const SUB_RESOURCE_CACHE = "private, max-age=31536000, immutable";

/**
 * The initial CMI state a re-opened package should see — "have I already
 * finished this?" and, for an assignment, "what did I score last time?".
 * Branches on which of `lessonId`/`assignmentId` the launch token carries
 * (see `ScormLaunchToken`'s own doc comment: exactly one is ever set).
 */
async function loadProgressContext(launchToken: { lessonId: string | null; assignmentId: string | null; userId: string }) {
  if (launchToken.lessonId) {
    const lesson = await rawPrisma.lesson.findUnique({ where: { id: launchToken.lessonId } });
    const enrollment = lesson
      ? await rawPrisma.enrollment.findUnique({
          where: { courseId_userId: { courseId: lesson.courseId, userId: launchToken.userId } },
        })
      : null;
    const alreadyDone = !!enrollment && lesson ? enrollment.completedLessonIds.includes(lesson.id) : false;
    return { alreadyDone, scoreRaw: null as number | null };
  }
  if (launchToken.assignmentId) {
    const submission = await rawPrisma.submission.findFirst({
      where: { assignmentId: launchToken.assignmentId, userId: launchToken.userId },
    });
    return { alreadyDone: submission?.score != null, scoreRaw: submission?.score ?? null };
  }
  return { alreadyDone: false, scoreRaw: null as number | null };
}

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

  const isWrapperRequest = path?.length === 1 && path[0] === WRAPPER_SEGMENT;
  if (isWrapperRequest) {
    const { alreadyDone, scoreRaw } = await loadProgressContext(launchToken);
    const shim = buildScormShimScript({
      token,
      progressUrl: `/api/scorm/${token}/progress`,
      initial: { lessonStatus: alreadyDone ? "completed" : "incomplete", scoreRaw, suspendData: "" },
    });
    const html = `<!doctype html>
<html>
<head>${shim}</head>
<body style="margin:0;padding:0;">
<iframe src="/api/scorm/${token}/${asset.scormLaunchPath}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" style="border:0;width:100%;height:100vh;display:block;"></iframe>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...CORS_HEADERS },
    });
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
        headers: { "Content-Type": contentType, "Cache-Control": SUB_RESOURCE_CACHE, ...CORS_HEADERS },
      });
    }
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": contentType, "Cache-Control": SUB_RESOURCE_CACHE, ...CORS_HEADERS },
    });
  }

  // Fallback (no SCORM_CONTENT_ORIGIN configured): inject the API shim
  // directly into the launch page itself, same-origin with this app, no
  // wrapper. Only works for SCOs that check their own window for the API —
  // see this file's own top comment.
  const { alreadyDone, scoreRaw } = await loadProgressContext(launchToken);
  const shim = buildScormShimScript({
    token,
    progressUrl: `/api/scorm/${token}/progress`,
    initial: { lessonStatus: alreadyDone ? "completed" : "incomplete", scoreRaw, suspendData: "" },
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
