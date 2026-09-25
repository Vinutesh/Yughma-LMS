import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/**
 * The classic `@prisma/client` package used to load `.env` itself as an
 * import side effect, which every local run (dev server, tests) quietly
 * relied on — gone now that the generated client is our own code, not that
 * package, so it's explicit here instead. `dotenv/config` no-ops (doesn't
 * throw) when no `.env` file exists, which is the real production/Vercel
 * case — env vars come from the platform directly there, never a file.
 */

/**
 * Neon's driver adapter, not Prisma's native query-engine binary — talks to
 * Neon over its own HTTP/WebSocket driver instead. Not a preference: the
 * native binary repeatedly failed to deploy on Vercel (`prisma generate`
 * ENOENT-copying a corrupted/missing engine from Vercel's own build-image
 * cache, reproduced across multiple deploys including with the build cache
 * explicitly cleared — a platform-level Prisma/Vercel bug, not anything in
 * this repo). The adapter path needs no native binary at all, which is also
 * what Prisma's own docs recommend for Neon + Vercel regardless of that bug.
 * `ws` is required in a plain Node.js runtime (as opposed to an edge runtime,
 * which has a native WebSocket already) — see `@neondatabase/serverless`'s
 * own setup docs.
 */
neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

/**
 * Single shared Prisma client. On serverless (Vercel), reuse across
 * invocations via a global to avoid exhausting Postgres's connection limit —
 * this is the one thing to get right before shipping, not after a production
 * incident. `DATABASE_URL` must be Neon's *pooled* connection string, not the
 * direct one (see BACKEND_PLAN.md).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const rawPrisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = rawPrisma;
}

/**
 * A foreign-key-violation check callers actually rely on (see
 * `users.ts`'s `delete` and `platform.ts`'s `eraseClientUser`) — worth
 * getting right in one place rather than duplicating a guess per call site.
 * With the Neon driver adapter (see this file's own doc comment above),
 * Prisma does NOT throw its usual `PrismaClientKnownRequestError` with a
 * `P2003` code for this — it throws a `DriverAdapterError` whose top-level
 * `.code` is undefined and whose real Postgres SQLSTATE lives at
 * `.cause.code` instead (confirmed against a real FK violation: `23503` for
 * a plain foreign-key violation, `23001` for a RESTRICT-specific one). A
 * message-substring check is what shipped here originally and silently
 * never matched (a casing mismatch against Postgres's own lowercase
 * wording) — checking the actual SQLSTATE is the fix, not a better guess at
 * a string to search for.
 */
export function isForeignKeyViolation(err: unknown): boolean {
  const code = (err as { cause?: { code?: string } })?.cause?.code;
  return code === "23503" || code === "23001";
}
