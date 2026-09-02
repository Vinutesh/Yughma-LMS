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
function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async ({ req }) => {
      const header = req.headers.get("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
      return createContext(token);
    },
  });
}

export { handler as GET, handler as POST };
