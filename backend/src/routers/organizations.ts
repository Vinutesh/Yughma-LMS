import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import { buildStorageKey, getUploadUrl, getDownloadUrl, isStorageConfigured } from "../storage/r2.js";

/**
 * Mirrors `frontend/src/lib/api/resources/organizations.ts`. One contract
 * change from the mock: every mutation here operates on *the caller's own*
 * org, taken from `ctx.session.orgId` — never from an `orgId` argument. The
 * `Organization` model is deliberately absent from tenantScope.ts's
 * TENANT_SCOPED_MODELS (it's the tenant identity, not a tenant-scoped child),
 * so `organization.update({ where: { id } })` is NOT auto-filtered by the
 * extension the way `course.update` is — accepting an `orgId` here at all
 * would let any org's `settings:manage` holder edit a different org's row by
 * just passing its id.
 */
export const organizationsRouter = router({
  updateGeneral: requirePermission("settings", "manage")
    .input(z.object({ name: z.string().min(1).optional(), industry: z.string().optional(), size: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.rawDb.organization.update({ where: { id: ctx.session.orgId }, data: input }),
    ),

  /** `logoUrl` here is actually the R2 storage key `requestLogoUpload`
   * handed out, not a real URL — see the schema field's own doc comment. */
  updateBranding: requirePermission("settings", "manage")
    .input(z.object({ logoUrl: z.string().optional(), accentColor: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.rawDb.organization.update({ where: { id: ctx.session.orgId }, data: input }),
    ),

  /** Step 1 of 2 for a logo change — mirrors `content.ts`'s `requestUpload`:
   * a signed PUT URL the browser uploads directly to, never through this
   * server. One fixed key per org ("logo" + extension), so re-uploading
   * simply overwrites the previous file rather than accumulating orphaned
   * ones. Step 2 is `updateBranding({ logoUrl: storageKey })` once the PUT
   * succeeds. */
  requestLogoUpload: requirePermission("settings", "manage")
    .input(z.object({ filename: z.string().min(1), contentType: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!isStorageConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "File storage isn't configured yet." });
      }
      if (!input.contentType.startsWith("image/")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Logo must be an image file." });
      }
      const storageKey = buildStorageKey(ctx.session.orgId, "logo", input.filename);
      const uploadUrl = await getUploadUrl(storageKey, input.contentType);
      return { uploadUrl, storageKey };
    }),

  /** The bucket is private, so the stored key (`Organization.logoUrl`) is
   * never directly usable as an `<img src>` — every render mints a fresh
   * signed URL here instead, same pattern `content.getLessonAssetUrl` uses
   * for lesson videos. `protectedProcedure`, not `settings:view` — every
   * employee at the org needs to see their own company's logo in the top
   * bar, not just settings admins. */
  getLogoUrl: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.rawDb.organization.findUnique({
      where: { id: ctx.session.orgId },
      select: { logoUrl: true },
    });
    if (!org?.logoUrl || !isStorageConfigured()) return { url: null };
    return { url: await getDownloadUrl(org.logoUrl) };
  }),

  updateSecurity: requirePermission("settings", "manage")
    .input(z.object({ sessionTimeoutHours: z.number().int().positive().optional(), requireSso: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.rawDb.organization.update({ where: { id: ctx.session.orgId }, data: input });
      await ctx.rawDb.auditLogEntry.create({
        data: {
          orgId: ctx.session.orgId,
          actorUserId: ctx.session.userId,
          action: "org_settings_changed",
          summary: "Security settings changed",
        },
      });
      return org;
    }),

  inventory: requirePermission("settings", "manage").query(async ({ ctx }) => {
    const [userCount, courseCount, certificateCount] = await Promise.all([
      ctx.db.user.count({}),
      ctx.db.course.count({}),
      ctx.db.certificate.count({ where: { revoked: false } }),
    ]);
    return { userCount, courseCount, certificateCount };
  }),

  listDepartments: requirePermission("users", "view").query(async ({ ctx }) => {
    const departments = await ctx.db.department.findMany({
      where: { archived: false },
      include: { teams: { where: { archived: false } }, _count: { select: { users: true } } },
    });
    return departments.map((d) => ({ ...d, memberCount: d._count.users }));
  }),

  createDepartment: requirePermission("users", "manage")
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.department.create({ data: { orgId: ctx.session.orgId, name: input.name.trim() } }),
    ),

  createTeam: requirePermission("users", "manage")
    .input(z.object({ departmentId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Department IS tenant-scoped, so this confirms it belongs to the
      // caller's org before the team gets created pointing at it — otherwise
      // a spoofed departmentId from another org would leave the new team
      // correctly org-scoped but referencing a foreign department, corrupting
      // the relation even though it wouldn't leak data across the isolation
      // boundary itself.
      const department = await ctx.db.department.findUnique({ where: { id: input.departmentId } });
      if (!department) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found." });

      return ctx.db.team.create({
        data: { orgId: ctx.session.orgId, departmentId: input.departmentId, name: input.name.trim() },
      });
    }),

  archiveDepartment: requirePermission("users", "manage")
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.department.update({ where: { id: input.id }, data: { archived: true } })),

  archiveTeam: requirePermission("users", "manage")
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.team.update({ where: { id: input.id }, data: { archived: true } })),
});
