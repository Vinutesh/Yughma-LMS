import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `yughma-backend` ships raw TypeScript source (no build step consumed by
  // the frontend) — this tells Next.js to run it through the same
  // build/dev pipeline as local app code instead of treating it as an
  // already-compiled node_modules package. Needed now that the backend is
  // imported for real (appRouter, createContext) by the tRPC Route Handler,
  // not just for its types.
  transpilePackages: ["yughma-backend"],
  turbopack: {
    // Without this, Turbopack guesses the workspace root from git boundaries
    // and lands on `frontend/` itself (it has no `.git` of its own) instead
    // of the actual npm-workspaces root one level up — which broke
    // resolution of the `yughma-backend` workspace symlink entirely
    // (`Module not found`), not just a cosmetic warning.
    root: path.join(__dirname, ".."),
  },
  // No security headers existed at all before this — a corporate customer's
  // own pentest would flag missing clickjacking/MIME-sniffing protection
  // immediately. `frame-ancestors 'none'` + `X-Frame-Options: DENY` block
  // this app from being embedded in a hostile iframe (session-riding via UI
  // redressing); `nosniff` stops a browser from executing a response as a
  // different content type than the server declared (relevant given uploaded
  // content is served from R2 rather than this origin, but cheap insurance
  // here too). CSP keeps `'unsafe-inline'`/`'unsafe-eval'` for script-src —
  // Next.js's dev overlay and inline hydration scripts need them — a stricter
  // nonce-based policy is a follow-up, not a regression from today's "no CSP
  // at all".
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              // Course video/audio is served from R2 (and later the CDN
              // Worker's own domain) — a different origin from this app by
              // design, since content deliberately doesn't route through
              // the app server. With no media-src rule, CSP falls back to
              // default-src 'self' and silently blocks every lesson video
              // from playing at all. https: matches the same pattern img-src
              // already uses for the same reason.
              "media-src 'self' https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
