import { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { rawPrisma } from "../db.js";

/**
 * Every Prisma model that carries a direct `orgId` column — i.e. every model
 * this extension can filter automatically. Join tables and child models with
 * no `orgId` of their own (`UserRole`, `Permission`, `CoursePrerequisite`,
 * `PathCourse`, `Lesson`, `Enrollment`, `Post`, ...) are deliberately
 * absent — NOT because they "inherit" scoping automatically (they don't;
 * that was this file's first, wrong version of this comment, corrected after
 * `roles.updatePermissions` and `users.updateRole` both shipped querying
 * `Permission`/`UserRole` by a raw id with no org check at all), but because
 * an extension can only filter a query it can see, and a bare
 * `db.userRole.deleteMany({ where: { userId } })` never mentions org
 * anywhere for it to filter on.
 *
 * **The required pattern for any resolver that touches one of these
 * unscoped models by an id from the request:** look up the tenant-scoped
 * parent first, through `ctx.db` (which throws/returns-null for a row from
 * another org), and only then touch the child — using the now-verified
 * parent's id, never a second unchecked id from the request. See
 * `roles.updatePermissions` / `roles.delete` / `users.updateRole` for the
 * pattern in practice. Skipping this step is exactly how `users:manage` in
 * org A could reassign org B's user's roles.
 *
 * If a new tenant-scoped model gets added to schema.prisma without a matching
 * entry here, this is the file to update in the same PR — the whole point of
 * this module is that forgetting to do so is the only way to reintroduce the
 * class of bug it exists to prevent.
 */
const TENANT_SCOPED_MODELS = new Set([
  "User",
  "Role",
  "Department",
  "Team",
  "AssetFolder",
  "Asset",
  "Course",
  "Assignment",
  "CertificateTemplate",
  "Certificate",
  "LearningPath",
  "LearningPlan",
  "CalendarEvent",
  "NotificationItem",
  "AuditLogEntry",
  "Skill",
  "Invoice",
  "SeatRequest",
  "Integration",
  "Webhook",
  "ApiKeyRecord",
  "XapiStatement",
  "LrsConnection",
  "Thread",
  "ContentReport",
]);

/**
 * Returns a Prisma client scoped to exactly one org — every read and write
 * against a tenant-scoped model is filtered to `orgId` automatically, so a
 * resolver cannot omit the filter even by accident. This is the single
 * highest-priority piece of the backend: see BACKEND_PLAN.md's tenant
 * isolation section for why forgetting one `where: { orgId }` clause is the
 * most dangerous class of bug in multi-tenant SaaS, and why the fix is to
 * make it structurally impossible rather than a convention every resolver
 * has to remember.
 *
 * Usage: every tRPC procedure gets its `ctx.db` from this, constructed once
 * per request from the caller's session — never from a client-supplied
 * parameter, which a forged request could set to another org's id.
 */
export function scopedPrisma(orgId: string): PrismaClient {
  if (!orgId) {
    throw new Error("scopedPrisma() called without an orgId — refusing to construct an unscoped client.");
  }

  return rawPrisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const scopedArgs = args as { where?: Record<string, unknown>; data?: unknown };

          switch (operation) {
            case "findUnique":
            case "findUniqueOrThrow":
            case "findFirst":
            case "findFirstOrThrow":
            case "findMany":
            case "count":
            case "aggregate":
            case "groupBy":
            case "updateMany":
            case "deleteMany":
              scopedArgs.where = { ...scopedArgs.where, orgId };
              break;

            case "update":
            case "delete":
              // Scoped the same way as the read ops — Prisma throws
              // "record not found" if the row belongs to another org, since
              // the compound filter simply won't match. That failure mode
              // (404, not 403) is deliberate: it doesn't confirm to a caller
              // that a differently-scoped row exists at all.
              scopedArgs.where = { ...scopedArgs.where, orgId };
              break;

            case "create":
              stampOrgId(scopedArgs.data, orgId);
              break;

            case "createMany":
              for (const row of asArray(scopedArgs.data)) stampOrgId(row, orgId);
              break;

            case "upsert": {
              const upsertArgs = args as { where?: Record<string, unknown>; create?: unknown };
              upsertArgs.where = { ...upsertArgs.where, orgId };
              stampOrgId(upsertArgs.create, orgId);
              break;
            }
          }

          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

/**
 * Always overwrites `orgId`, never just fills it in when absent. A caller
 * passing a different org's id on create (by bug or by malice) must land in
 * *this* client's org regardless — the scoped client's whole point is that
 * its org is fixed by construction, not by whatever the payload happens to
 * contain. Silently "filling in the gaps" would let a spoofed orgId in the
 * request body slip straight through.
 */
function stampOrgId(data: unknown, orgId: string): void {
  if (data && typeof data === "object") {
    (data as Record<string, unknown>).orgId = orgId;
  }
}

function asArray(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? data : [];
}

export type { Prisma };
