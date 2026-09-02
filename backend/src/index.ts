import http from "node:http";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { appRouter } from "./routers/_app.js";
import { createContext } from "./trpc/context.js";

/**
 * Standalone HTTP server for local development against a real database —
 * `npm run dev` here, then point the frontend's resource-client files at
 * `http://localhost:4000`. The production target is very likely mounting
 * `appRouter` into a Next.js Route Handler instead (co-located with the
 * frontend, one deploy) rather than running this as its own service; swap
 * this adapter for `@trpc/server/adapters/fetch` at that point without
 * touching anything under `routers/` or `trpc/`.
 *
 * Session token comes from the `Authorization: Bearer <token>` header —
 * simplest thing that works for a standalone API server talking to a SPA-ish
 * frontend. If this ends up served from the same origin as the frontend
 * (the Next.js Route Handler path above), switch to an httpOnly cookie
 * instead, which is the safer default once same-origin makes CSRF the actual
 * concern to design against rather than token storage.
 */
const trpcHandler = createHTTPHandler({
  router: appRouter,
  createContext: async ({ req }) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
    return createContext(token);
  },
});

/**
 * The Next.js frontend runs on a different origin (localhost:3000 vs this
 * server's :4000) — without these headers every browser request (not just
 * curl/server-to-server ones) is blocked at the CORS preflight before it
 * ever reaches a resolver. `createHTTPHandler` (unlike `createHTTPServer`)
 * has no built-in middleware hook, so this wraps it in a plain `http.Server`
 * that sets the headers first. `CORS_ORIGIN` lets a real deployment lock
 * this to its actual frontend origin instead of allowing any origin.
 */
const server = http.createServer((req, res) => {
  // Defaults to the frontend's own local dev origin, never "*" — a wildcard
  // origin on an endpoint that accepts an `Authorization` bearer header
  // would let any site's script that lured a logged-in user into visiting
  // it read that response cross-origin (the browser only withholds
  // credentials from a "*" response when `credentials: "include"`/cookies
  // are in play, which this bearer-token setup doesn't use — so "*" here
  // was a real cross-origin data exposure, not just a lint nit).
  // `CORS_ORIGIN` still overrides this for any real non-Next.js deployment.
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN ?? "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  // Reflecting the browser's actual preflight ask (rather than a fixed list)
  // is what catches headers tRPC adds that aren't obvious from the outside —
  // `trpc-accept` on query GETs being the one that silently broke every
  // `useQuery` call here: mutations (POST + Content-Type only) preflighted
  // fine, so login/logout worked while list queries hung with no console
  // error at all, since a disallowed-header preflight failure doesn't throw,
  // it just never lets the real request go out.
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ?? "Content-Type, Authorization",
  );
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  trpcHandler(req, res);
});

const port = Number(process.env.PORT ?? 4000);
server.listen(port);
console.log(`tRPC server listening on :${port}`);
