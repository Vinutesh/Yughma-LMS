import crypto from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";

const LAUNCH_TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours — a generous single SCORM session

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

  /**
   * Issues a `ScormLaunchToken` and returns the URL to embed in the
   * player's iframe. `protectedProcedure`, not `requirePermission` — a
   * plain Learner holds zero permissions (see the seed script) and must
   * still be able to launch a SCORM lesson OR a SCORM-attached assignment
   * they're enrolled in, same reasoning as `content.getLessonAssetUrl`.
   * Enrollment is re-checked here server-side regardless of what the
   * frontend's own (non-authoritative) check already decided.
   *
   * Exactly one of `lessonId`/`assignmentId` is expected — both resolve to
   * the same (courseId, assetId) shape before the shared enrollment check
   * and token issuance below, so a SCORM assignment gets the identical
   * sandboxed-iframe treatment a SCORM lesson always has, not a parallel
   * implementation.
   */
  getLaunchUrl: protectedProcedure
    .input(z.object({ lessonId: z.string().optional(), assignmentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      let courseId: string;
      let assetId: string | null;

      if (input.lessonId) {
        const lesson = await ctx.rawDb.lesson.findUnique({ where: { id: input.lessonId } });
        if (!lesson || lesson.contentType !== "scorm" || !lesson.assetId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });
        }
        courseId = lesson.courseId;
        assetId = lesson.assetId;
      } else if (input.assignmentId) {
        const assignment = await ctx.rawDb.assignment.findUnique({ where: { id: input.assignmentId } });
        if (!assignment || !assignment.assetId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });
        }
        courseId = assignment.courseId;
        assetId = assignment.assetId;
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Specify a lesson or an assignment." });
      }

      const enrollment = await ctx.rawDb.enrollment.findUnique({
        where: { courseId_userId: { courseId, userId: ctx.session.userId } },
      });
      if (!enrollment || enrollment.status === "requested") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled in this course." });
      }

      const asset = await ctx.rawDb.asset.findUnique({ where: { id: assetId } });
      if (!asset || asset.kind !== "scorm" || !asset.scormLaunchPath) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This package isn't ready yet." });
      }

      // Opportunistic sweep: these rows are single-session credentials that
      // nothing ever reads once expired, and minting one is the natural
      // moment to clear this learner's dead ones — cheaper than a cron for
      // a table that only grows by one row per launch.
      await ctx.rawDb.scormLaunchToken.deleteMany({
        where: { userId: ctx.session.userId, expiresAt: { lt: new Date() } },
      });

      const token = crypto.randomBytes(24).toString("base64url");
      await ctx.rawDb.scormLaunchToken.create({
        data: {
          token,
          userId: ctx.session.userId,
          lessonId: input.lessonId,
          assignmentId: input.assignmentId,
          assetId: asset.id,
          expiresAt: new Date(Date.now() + LAUNCH_TOKEN_TTL_MS),
        },
      });

      // Ends in the package's real filename (e.g. "index_lms.html"), not a
      // bare token — found necessary against a real Articulate Storyline
      // export, whose own bootstrap script computes sibling-asset paths from
      // `window.location.pathname` directly rather than through the DOM's
      // base-URL-aware resolution, so an injected <base> tag alone doesn't
      // help it. Ending the URL in the real filename means *any*
      // path-computation strategy — browser-native or a script parsing
      // location.pathname by hand — lands on the same correct directory,
      // exactly like a plain static file server would have served this same
      // package. See the route handler's own doc comment for the full story.
      // SCORM_CONTENT_ORIGIN, when set, points at a dedicated origin (e.g.
      // https://scorm.yughma.com) that serves nothing but /api/scorm/* — see
      // proxy.ts. Real authoring-tool runtimes (confirmed: Storyline's bundled
      // Rustici SCORM Driver) locate the LMS API object by walking
      // window.parent/window.top.opener; they never check their own window.
      // Even with allow-same-origin on the SCO's sandbox, that walk only
      // succeeds if an *ancestor* frame is both same-origin with the SCO and
      // actually defines the API — the real app page one level up never is
      // (different real origin), so the URL handed out here points at a
      // small trusted "wrapper" document instead of the launch file directly.
      // The wrapper (see the route handler's own doc comment) is same-origin
      // with the SCO, defines the API, and iframes the real launch file
      // beneath itself. Without SCORM_CONTENT_ORIGIN configured, none of this
      // is safe (that origin would be this app's own), so the URL points
      // straight at the launch file with no wrapper and no allow-same-origin —
      // real authoring-tool output will still hang in that mode, a known,
      // deliberate limitation until the isolated origin is set up.
      const scormOrigin = process.env.SCORM_CONTENT_ORIGIN;
      const url = scormOrigin
        ? `${scormOrigin}/api/scorm/${token}/__scorm_wrapper__`
        : `/api/scorm/${token}/${asset.scormLaunchPath}`;
      return { url, crossOrigin: !!scormOrigin };
    }),
});
