import { PrismaClient } from "@prisma/client";

/**
 * Single shared Prisma client. On serverless (Vercel), reuse across
 * invocations via a global to avoid exhausting Postgres's connection limit —
 * this is the one thing to get right before shipping, not after a production
 * incident. `DATABASE_URL` must be Neon's *pooled* connection string, not the
 * direct one (see BACKEND_PLAN.md).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const rawPrisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = rawPrisma;
}
