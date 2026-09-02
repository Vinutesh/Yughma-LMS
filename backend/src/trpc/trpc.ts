import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    // `cause` is server-only by tRPC's default — the frontend's lockout
    // countdown needs `retryAt` (set via `TRPCError({ cause: { retryAt } })`
    // in auth.login) to actually reach the client, so it's copied into
    // `data` explicitly here rather than assuming a plain object cause
    // crosses the wire on its own.
    const cause = error.cause;
    const retryAt =
      cause && typeof cause === "object" && "retryAt" in cause
        ? (cause as { retryAt: unknown }).retryAt
        : undefined;
    return {
      ...shape,
      // Never ship a server stack trace to the client — caught live during
      // the login smoke test, where an UNAUTHORIZED response included the
      // full file path and call stack. Fine for a local dev console; not
      // something an API response should ever carry, in dev or prod.
      data: { ...shape.data, stack: undefined, retryAt },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Every procedure that touches tenant data goes through this, not
 * `publicProcedure` — it's what guarantees `ctx.db` exists (and is therefore
 * scoped) inside the resolver. There is deliberately no "trust me, add the
 * where clause yourself" escape hatch: a resolver that needs data simply
 * cannot get an unscoped client through this path.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.db) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      db: ctx.db,
    },
  });
});

/**
 * Layers a permission check on top of `protectedProcedure`. Mirrors the
 * frontend's `hasPermission()` hierarchy (manage ⊇ edit ⊇ view) — re-checked
 * here because the client's copy of its own permissions (`sessionStore`) is a
 * UI convenience, never the enforcement point. See SECURITY_REVIEW.md.
 */
export function requirePermission(resource: string, action: "view" | "edit" | "manage") {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const rank = { view: 1, edit: 2, manage: 3 } as const;
    const roles = await ctx.db!.role.findMany({
      where: { id: { in: ctx.session.roleIds } },
      include: { permissions: true },
    });
    const allowed = roles.some((role) =>
      role.permissions.some((p) => p.resource === resource && rank[p.action as keyof typeof rank] >= rank[action]),
    );
    if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx });
  });
}

/**
 * A second, separate authority tier from `requirePermission` — not "manage
 * courses within my own org" but "act across every client org": create a
 * company's account, create an individual learner's account, grant/revoke
 * their access to a course. Two independent facts must both hold: the
 * caller's own org is THE platform org (`isPlatform: true` — there's meant
 * to be exactly one), and they hold a role granting `platform:manage`
 * within it. Neither alone is enough — a compromised/misconfigured role in
 * some other org can never satisfy the first check, and merely being a
 * platform-org member with no explicit `platform:manage` role can't satisfy
 * the second. See `routers/platform.ts` for what this actually gates.
 */
export const requirePlatformAdmin = protectedProcedure.use(async ({ ctx, next }) => {
  const org = await ctx.rawDb.organization.findUnique({ where: { id: ctx.session.orgId } });
  if (!org?.isPlatform) throw new TRPCError({ code: "FORBIDDEN" });

  const roles = await ctx.rawDb.role.findMany({
    where: { id: { in: ctx.session.roleIds }, orgId: ctx.session.orgId },
    include: { permissions: true },
  });
  const allowed = roles.some((role) => role.permissions.some((p) => p.resource === "platform" && p.action === "manage"));
  if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });

  return next({ ctx });
});
