import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * `SCORM_CONTENT_ORIGIN` (see `backend/src/routers/scorm.ts`'s `getLaunchUrl`)
 * points SCORM iframes at a dedicated hostname, isolated from the real app,
 * so that hostname's sandbox can safely carry `allow-same-origin` — real
 * authoring-tool runtimes need genuine cross-frame property access to find
 * their SCORM API object, and granting that on the app's own origin would
 * let uploaded package JS fully script the real app (session token,
 * cookies, everything). That isolation only holds if this hostname *only*
 * ever serves `/api/scorm/*` — anything else (the real app's pages,
 * `/api/trpc`, etc.) must never render there, or a package could navigate
 * its own top frame to a same-app-shaped page on the "isolated" host and
 * we'd have granted it nothing. This is the one enforcement point for that.
 */
const SCORM_CONTENT_HOST = process.env.SCORM_CONTENT_ORIGIN
  ? new URL(process.env.SCORM_CONTENT_ORIGIN).hostname
  : undefined;

export function proxy(request: NextRequest) {
  // `request.nextUrl.hostname` is unreliable here — Next.js's dev server
  // (confirmed with Turbopack) normalizes it to the configured local dev
  // host rather than reflecting the real incoming Host header, so a
  // request actually addressed to SCORM_CONTENT_HOST reads back as
  // "localhost". The raw `Host` request header is the real signal.
  const hostHeader = request.headers.get("host") ?? "";
  const hostname = hostHeader.split(":")[0];
  if (SCORM_CONTENT_HOST && hostname === SCORM_CONTENT_HOST) {
    if (!request.nextUrl.pathname.startsWith("/api/scorm/")) {
      return new NextResponse("Not found.", { status: 404 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
