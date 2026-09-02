import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// Imports the *compiled* backend, not raw src — the backend's own tsconfig
// uses NodeNext module resolution (relative imports end in `.js`, matching
// files that are actually `.ts` on disk), which `tsc`/`tsx` resolve
// natively but Turbopack doesn't map across a package boundary. Compiled
// `dist/` output has real `.js` files, so plain bundler resolution just
// works. Run `npm run build` in `backend/` after changing any backend
// router/trpc file — this route serves whatever was last built, not live
// source (see the note in `backend/package.json`'s `dev` script description
// for the local-dev workflow this implies).
import { appRouter } from "yughma-backend/dist/routers/_app.js";
import { createContext } from "yughma-backend/dist/trpc/context.js";

/**
 * The backend, mounted as a Next.js Route Handler instead of the standalone
 * server in `backend/src/index.ts` — this is the swap that file's own doc
 * comment anticipated. Frontend and backend now deploy as one Vercel
 * project: no separate host, no CORS (same-origin), one dev server.
 *
 * `backend/src/index.ts` still works standalone (its own tests call
 * `appRouter.createCaller()` directly, bypassing HTTP entirely, so nothing
 * there depends on this file) — kept as an alternate entry point for anyone
 * who wants to run the backend outside of Next.js, not the primary path.
 */
/** Same reasoning as the standalone server's own cap (`backend/src/index.ts`)
 * — nothing legitimate sends this route a large body, since real file
 * uploads go browser-direct to R2. The hosting platform (Vercel) enforces
 * its own ceiling on serverless function bodies too, but that's an infra
 * default, not something this app controls or should rely on alone. */
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

/** Best-effort client IP behind Vercel/Cloudflare-style proxies — see the
 * standalone server's `clientIp()` for the same caveat: only ever used for
 * `auth.login`'s IP lockout, not a security boundary by itself. */
function clientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
}

function handler(req: Request) {
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Request body too large." }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async ({ req }) => {
      const header = req.headers.get("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
      return createContext(token, clientIp(req));
    },
  });
}

export { handler as GET, handler as POST };
