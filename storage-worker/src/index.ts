export interface Env {
  CONTENT_BUCKET: R2Bucket;
  /** Same secret the backend uses to sign URLs (see `backend/src/storage/cdn.ts`) —
   * set via `wrangler secret put SIGNING_SECRET`, never committed. */
  SIGNING_SECRET: string;
}

/**
 * Sits in front of the (private) content R2 bucket, on Cloudflare's own edge
 * network — this is the "Cloudflare CDN" layer in the architecture: the
 * browser streams directly from here, never through the Vercel app server.
 * The bucket itself is never public; every request must carry a signature
 * this Worker verifies against `expires`+`key`, minted server-side by the
 * backend with a short TTL (see `content.ts` router's `getStreamingUrl`
 * calls). An expired or forged link is rejected before R2 is ever touched.
 *
 * Deployed with `wrangler deploy` — see this project's README for the full
 * one-time setup (bucket binding, custom domain, signing secret).
 */

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(key: string, expires: number, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(`${key}:${expires}`));
  return toHex(sig);
}

/** Constant-time compare — a signature check that short-circuits on the
 * first mismatched byte leaks timing information an attacker could use to
 * forge a valid token one byte at a time. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "Range",
  };
}

type RangeResult =
  | { status: 200; object: R2ObjectBody; size: number }
  | { status: 206; object: R2ObjectBody; size: number; start: number; end: number }
  | { status: 404 }
  | { status: 416; size: number };

/** R2's binding API needs an explicit byte offset/length for a ranged read —
 * unlike a plain HTTP proxy, there's no server "just forward the Range
 * header" shortcut, so the `Range: bytes=...` header is parsed by hand.
 * Range support matters here specifically because `<video>` scrubbing
 * depends on it — without it, seeking in a video would re-download the
 * whole file from the start every time. */
async function fetchWithRange(bucket: R2Bucket, key: string, rangeHeader: string | null): Promise<RangeResult> {
  const head = await bucket.head(key);
  if (!head) return { status: 404 };
  const size = head.size;

  if (!rangeHeader) {
    const object = await bucket.get(key);
    if (!object) return { status: 404 };
    return { status: 200, object, size };
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) {
    const object = await bucket.get(key);
    if (!object) return { status: 404 };
    return { status: 200, object, size };
  }

  let start: number;
  let end: number;
  if (match[1] === "") {
    // Suffix range: "bytes=-500" means the last 500 bytes.
    const suffixLength = parseInt(match[2], 10);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = parseInt(match[1], 10);
    end = match[2] ? parseInt(match[2], 10) : size - 1;
  }

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return { status: 416, size };
  }
  end = Math.min(end, size - 1);

  const object = await bucket.get(key, { range: { offset: start, length: end - start + 1 } });
  if (!object) return { status: 404 };
  return { status: 206, object, size, start, end };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const expiresParam = url.searchParams.get("expires");
    const token = url.searchParams.get("token");

    if (!key || !expiresParam || !token) {
      return new Response("Missing parameters", { status: 400, headers: corsHeaders() });
    }

    const expires = Number(expiresParam);
    if (!Number.isFinite(expires) || Date.now() / 1000 > expires) {
      return new Response("Link expired", { status: 403, headers: corsHeaders() });
    }

    const expected = await sign(key, expires, env.SIGNING_SECRET);
    if (!timingSafeEqual(expected, token)) {
      return new Response("Invalid signature", { status: 403, headers: corsHeaders() });
    }

    const result = await fetchWithRange(env.CONTENT_BUCKET, key, request.headers.get("range"));

    if (result.status === 404) return new Response("Not found", { status: 404, headers: corsHeaders() });
    if (result.status === 416) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { ...corsHeaders(), "content-range": `bytes */${result.size}` },
      });
    }

    const headers = new Headers(corsHeaders());
    result.object.writeHttpMetadata(headers);
    headers.set("etag", result.object.httpEtag);
    headers.set("accept-ranges", "bytes");
    // Private, short cache — these URLs are per-request and time-limited
    // anyway; this just avoids re-fetching the same byte range twice within
    // one playback session.
    headers.set("cache-control", "private, max-age=3600");

    if (result.status === 206) {
      headers.set("content-range", `bytes ${result.start}-${result.end}/${result.size}`);
      headers.set("content-length", String(result.end - result.start + 1));
    }

    return new Response(request.method === "HEAD" ? null : result.object.body, {
      status: result.status,
      headers,
    });
  },
};
