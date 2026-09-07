/**
 * The app's canonical public URL — same `APP_URL` convention the backend's
 * email templates already use (`backend/src/email/resend.ts`), so there's
 * one env var to set for both, not two slightly-different ones to keep in
 * sync. Falls back to localhost for dev; set `APP_URL` in production so
 * metadata/sitemap/robots don't ship a placeholder domain.
 */
export const SITE_URL = process.env.APP_URL ?? "http://localhost:3000";
