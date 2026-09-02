import crypto from "node:crypto";

/**
 * Mints URLs pointing at the `storage-worker` Cloudflare Worker (see
 * `LMS/storage-worker/`), not at R2 directly — that Worker is bound to the
 * R2 bucket and runs entirely on Cloudflare's edge, so this is the
 * "Browser → Cloudflare CDN → R2" path the architecture calls for, never
 * "Browser → Vercel → R2". The bucket itself stays private; every URL
 * carries an HMAC signature the Worker verifies (see its own `sign()`)
 * before it will stream a single byte, using the exact same secret and
 * message format on both sides.
 */

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

export function isCdnConfigured(): boolean {
  return !!(getEnv("CONTENT_WORKER_URL") && getEnv("CONTENT_SIGNING_SECRET"));
}

/** Short-lived by default (1 hour) — long enough for one playback session,
 * short enough that a leaked link (a browser history entry, a proxy log)
 * stops working soon after. */
export function getStreamingUrl(storageKey: string, expiresInSeconds = 60 * 60): string {
  const workerUrl = getEnv("CONTENT_WORKER_URL");
  const secret = getEnv("CONTENT_SIGNING_SECRET");
  if (!workerUrl || !secret) {
    throw new Error(
      "The content CDN isn't configured — set CONTENT_WORKER_URL and CONTENT_SIGNING_SECRET (see backend/.env.example).",
    );
  }

  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  // Must match the Worker's `sign()` exactly: same message shape, same
  // secret, same hex digest — the two sides never share code, only this
  // convention, so a mismatch here silently breaks every playback link.
  const token = crypto.createHmac("sha256", secret).update(`${storageKey}:${expires}`).digest("hex");
  const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");
  return `${workerUrl.replace(/\/$/, "")}/${encodedKey}?expires=${expires}&token=${token}`;
}
