import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission } from "../trpc/trpc.js";

/**
 * Mirrors `frontend/src/lib/api/resources/scorm.ts`. `XapiStatement` and
 * `LrsConnection` are both directly tenant-scoped (see tenantScope.ts), so
 * both go through `ctx.db` as usual.
 *
 * Read-only debug/compliance surface, same as the mock — there is no real
 * SCORM package processing or live LRS behind this. One real gap versus the
 * mock: the mock *derived* xAPI statements on read from lesson-completion
 * events already in its store; here, `XapiStatement` is a real table that
 * nothing in this migration's scope writes to (that hook would live in
 * `courses.ts`'s `setLessonComplete`, which is out of scope for this pass).
 * `listStatements` faithfully reads whatever rows exist — it just won't show
 * anything until something starts writing them.
 */
export const scormRouter = router({
  listStatements: requirePermission("roles", "view").query(async ({ ctx }) => {
    const statements = await ctx.db.xapiStatement.findMany({ orderBy: { at: "desc" } });
    const actorIds = [...new Set(statements.map((s) => s.actorUserId))];
    const actors = actorIds.length > 0 ? await ctx.db.user.findMany({ where: { id: { in: actorIds } } }) : [];
    const nameById = new Map(actors.map((u) => [u.id, u.name]));
    return statements.map((s) => ({ ...s, actorName: nameById.get(s.actorUserId) ?? "Unknown" }));
  }),

  /** `authKey` is a bearer credential for the org's external LRS — masked
   * here rather than returned in full, since this only requires
   * `settings:view` (Managers hold that), not `settings:manage`. A viewer
   * still sees enough to confirm a key is set without being handed the
   * secret itself. */
  getLrsConnection: requirePermission("settings", "view").query(async ({ ctx }) => {
    const connection = await ctx.db.lrsConnection.findUnique({ where: { orgId: ctx.session.orgId } });
    if (!connection) return { orgId: ctx.session.orgId, endpointUrl: "", authKey: "", connected: false };
    return {
      ...connection,
      authKey: connection.authKey ? `••••${connection.authKey.slice(-4)}` : "",
    };
  }),

  saveLrsConnection: requirePermission("settings", "manage")
    .input(z.object({ endpointUrl: z.string(), authKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      let endpointUrl = input.endpointUrl.trim();
      if (endpointUrl) {
        try {
          const parsed = new URL(endpointUrl);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Endpoint must be a full URL, like https://lrs.example.com/xapi.",
          });
        }
      }
      // Never actually connects — this is a stored config, not a live integration.
      return ctx.db.lrsConnection.upsert({
        where: { orgId: ctx.session.orgId },
        create: { orgId: ctx.session.orgId, endpointUrl, authKey: input.authKey, connected: false },
        update: { endpointUrl, authKey: input.authKey, connected: false },
      });
    }),
});
