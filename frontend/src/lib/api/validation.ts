import { ApiError } from "@/lib/api/errors";

/**
 * Rejects any URL scheme except http/https before it's stored. Without this,
 * a "javascript:" or "data:" value typed into a Link lesson or calendar event
 * gets persisted as-is and executes when a learner clicks "Open resource" —
 * this is the standard stored-XSS vector for any field that renders
 * user-entered input as a clickable link or href. Every call site that
 * accepts a free-text URL from a form (lesson links, calendar event links,
 * course/certificate external references) must run new values through this
 * before they reach the store.
 */
export function assertSafeUrl(url: string | undefined, fieldLabel = "Link"): string | undefined {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiError("validation", `${fieldLabel} must be a full URL, like https://example.com.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ApiError("validation", `${fieldLabel} must start with http:// or https://.`);
  }
  return trimmed;
}
