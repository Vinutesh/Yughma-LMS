import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, requirePlatformAdmin, protectedProcedure, publicProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";
import { rawPrisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { resolvePlaybackUrl } from "./content.js";

type RawDb = typeof rawPrisma;

const positionSchema = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });
const overlayLayoutSchema = z.object({ name: positionSchema, course: positionSchema, date: positionSchema });

/** Resolves every template's background image to a signed URL once,
 * shared across however many certificates use it — called with the exact
 * set of templates a given query already fetched, never a fresh scan. */
async function resolveBackgroundUrls(db: RawDb, templates: { id: string; backgroundAssetId: string | null }[]) {
  const byTemplateId = new Map<string, string | undefined>();
  await Promise.all(
    templates.map(async (t) => {
      if (!t.backgroundAssetId) return;
      const asset = await db.asset.findUnique({ where: { id: t.backgroundAssetId } });
      byTemplateId.set(t.id, asset ? await resolvePlaybackUrl(asset.storageKey) : undefined);
    }),
  );
  return byTemplateId;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Retries on collision rather than trusting randomness alone — the unique
 * index is the real guarantee, this just avoids surfacing that as a user-
 * facing error on the (astronomically rare) collision. */
async function generateVerificationCode(): Promise<string> {
  for (let tries = 0; tries < 50; tries++) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const chars = Array.from(bytes, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]);
    const code = `YU-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
    const existing = await rawPrisma.certificate.findUnique({ where: { verificationCode: code } });
    if (!existing) return code;
  }
  throw new TRPCError({ code: "CONFLICT", message: "Couldn't generate a unique verification code. Try again." });
}

/**
 * Single issuance path for every trigger — course completion and manual
 * admin issue both land here, so the code format and duplicate guard can't
 * drift between them. Exported for `courses.ts` to call directly on
 * completion — `db` is the caller's own client, never re-derived here,
 * since this always runs inside another resolver's request.
 *
 * Typed to accept `RawDb` (a superset of `ScopedDb`'s shape) since callers
 * fall into two different cases: `courses.ts` passes `ctx.db` (the
 * certificate lands in the *caller's own* org — correct there, since the
 * caller IS the learner earning it) but `certificates.ts`'s own
 * `issueManually` must pass `ctx.rawDb` and an explicit target `orgId` —
 * the recipient is a different org than the platform-admin caller, and a
 * *scoped* client would silently force `orgId` back to the caller's own org
 * (see `tenantScope.ts`'s `stampOrgId`), which would be wrong here.
 */
export async function issueCertificate(
  db: RawDb,
  input: {
    orgId: string;
    userId: string;
    templateId: string;
    sourceKind: "course" | "path" | "manual";
    sourceId?: string;
    sourceTitle: string;
  },
) {
  const existing = await db.certificate.findFirst({
    where: { userId: input.userId, templateId: input.templateId, sourceId: input.sourceId ?? null, revoked: false },
  });
  if (existing) return existing;

  return db.certificate.create({
    data: {
      orgId: input.orgId,
      templateId: input.templateId,
      userId: input.userId,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      sourceTitle: input.sourceTitle,
      verificationCode: await generateVerificationCode(),
    },
  });
}

function decorate(
  c: Awaited<ReturnType<ScopedDb["certificate"]["findMany"]>>[number],
  template: { name: string; backgroundUrl?: string; overlayLayout: unknown },
  recipientName: string,
  orgName: string,
) {
  return {
    ...c,
    templateName: template.name,
    recipientName,
    orgName,
    backgroundUrl: template.backgroundUrl,
    overlayLayout: template.overlayLayout ?? null,
  };
}

export const certificatesRouter = router({
  listTemplates: requirePermission("courses", "view").query(({ ctx }) =>
    ctx.db.certificateTemplate.findMany(),
  ),

  /** The raw background image's signed URL, for the drag-to-position tool
   * to preview against before any certificate has actually been issued
   * from this template (unlike `list`/`mine`/`verifyCode`, which only
   * resolve a background as a side effect of returning real certificates). */
  getTemplateBackgroundUrl: requirePermission("courses", "view")
    .input(z.object({ templateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.certificateTemplate.findUnique({ where: { id: input.templateId } });
      if (!template || !template.backgroundAssetId) throw new TRPCError({ code: "NOT_FOUND", message: "No background set." });
      const asset = await ctx.db.asset.findUnique({ where: { id: template.backgroundAssetId } });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Background image not found." });
      return { url: await resolvePlaybackUrl(asset.storageKey) };
    }),

  createTemplate: requirePermission("courses", "edit")
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.certificateTemplate.create({ data: { orgId: ctx.session.orgId, name: input.name.trim() } }),
    ),

  /** Sets or clears a template's uploaded background design and the
   * drag-to-position layout for its three dynamic fields (name, course,
   * date). `backgroundAssetId: null` removes the background entirely,
   * reverting that template to the app's one fixed layout. */
  updateTemplate: requirePermission("courses", "edit")
    .input(
      z.object({
        templateId: z.string(),
        backgroundAssetId: z.string().nullable().optional(),
        overlayLayout: overlayLayoutSchema.nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.certificateTemplate.findUnique({ where: { id: input.templateId } });
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Certificate not found." });

      if (input.backgroundAssetId) {
        const asset = await ctx.db.asset.findUnique({ where: { id: input.backgroundAssetId } });
        if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Background image not found." });
      }

      return ctx.db.certificateTemplate.update({
        where: { id: input.templateId },
        data: {
          backgroundAssetId: input.backgroundAssetId,
          overlayLayout: input.overlayLayout === null ? Prisma.JsonNull : input.overlayLayout,
        },
      });
    }),

  /**
   * Cross-company view, newest first — a `Certificate` lives in the
   * *recipient's* own org (so their own company can see it — see
   * `issueCertificate`'s doc comment), never the platform org, so this is
   * necessarily cross-tenant and gated by `requirePlatformAdmin` rather than
   * `requirePermission`, reading everything via `rawDb`.
   */
  list: requirePlatformAdmin.query(async ({ ctx }) => {
    const [certificates, templates, users, orgs] = await Promise.all([
      ctx.rawDb.certificate.findMany({ orderBy: { issuedAt: "desc" } }),
      ctx.rawDb.certificateTemplate.findMany(),
      ctx.rawDb.user.findMany({ select: { id: true, name: true } }),
      ctx.rawDb.organization.findMany({ select: { id: true, name: true } }),
    ]);
    const templateById = new Map(templates.map((t) => [t.id, t]));
    const backgroundUrlByTemplateId = await resolveBackgroundUrls(ctx.rawDb, templates);
    const userName = new Map(users.map((u) => [u.id, u.name]));
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    return certificates.map((c) => {
      const template = templateById.get(c.templateId);
      return decorate(
        c,
        {
          name: template?.name ?? "Certificate of Completion",
          backgroundUrl: backgroundUrlByTemplateId.get(c.templateId),
          overlayLayout: template?.overlayLayout,
        },
        userName.get(c.userId) ?? "Unknown recipient",
        orgName.get(c.orgId) ?? "Unknown organization",
      );
    });
  }),

  /** The learner's own wallet. Revoked certificates drop out of it.
   * `CertificateTemplate` lives in the platform org, not the learner's own
   * — `ctx.rawDb` for that lookup specifically, or every template name
   * would silently fall back to "Certificate of Completion". */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const certificates = await ctx.db.certificate.findMany({
      where: { userId: ctx.session.userId, revoked: false },
      orderBy: { issuedAt: "desc" },
    });
    const templates = await ctx.rawDb.certificateTemplate.findMany();
    const templateById = new Map(templates.map((t) => [t.id, t]));
    const backgroundUrlByTemplateId = await resolveBackgroundUrls(ctx.rawDb, templates);
    const org = await ctx.rawDb.organization.findUniqueOrThrow({ where: { id: ctx.session.orgId } });
    const user = await ctx.db.user.findUniqueOrThrow({ where: { id: ctx.session.userId } });
    return certificates.map((c) => {
      const template = templateById.get(c.templateId);
      return decorate(
        c,
        {
          name: template?.name ?? "Certificate of Completion",
          backgroundUrl: backgroundUrlByTemplateId.get(c.templateId),
          overlayLayout: template?.overlayLayout,
        },
        user.name,
        org.name,
      );
    });
  }),

  /**
   * Backs the public, no-login verification page — deliberately the one
   * `publicProcedure` in this router. Reveals nothing beyond what the
   * certificate itself already prints, and never confirms whether an unknown
   * code merely doesn't exist versus belongs to another org — this queries
   * `rawPrisma` directly (unscoped), precisely because there's no caller org
   * to scope to and the lookup is by a globally-unique verification code.
   */
  verifyCode: publicProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
    const code = input.code.trim().toUpperCase();
    const certificate = await rawPrisma.certificate.findFirst({
      where: { verificationCode: { equals: code, mode: "insensitive" } },
    });
    if (!certificate) return { status: "unknown" as const, code };
    if (certificate.revoked) return { status: "revoked" as const, code: certificate.verificationCode };

    const [template, user, org] = await Promise.all([
      rawPrisma.certificateTemplate.findUniqueOrThrow({ where: { id: certificate.templateId } }),
      rawPrisma.user.findUniqueOrThrow({ where: { id: certificate.userId } }),
      rawPrisma.organization.findUniqueOrThrow({ where: { id: certificate.orgId } }),
    ]);
    const backgroundUrlByTemplateId = await resolveBackgroundUrls(rawPrisma, [template]);
    return {
      status: "valid" as const,
      certificate: decorate(
        certificate,
        { name: template.name, backgroundUrl: backgroundUrlByTemplateId.get(template.id), overlayLayout: template.overlayLayout },
        user.name,
        org.name,
      ),
    };
  }),

  /** The recipient is always a learner in some client org, never the
   * platform org itself — `ctx.rawDb` for the user lookup (a scoped lookup
   * would never find them), and the certificate is stamped with the
   * *recipient's* own `orgId`, not the caller's, so it shows up in their own
   * company's records. Passing `ctx.db` here (scoped to the platform org)
   * would have silently forced the certificate into the wrong org — see
   * `issueCertificate`'s doc comment. */
  issueManually: requirePlatformAdmin
    .input(z.object({ userId: z.string(), templateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.rawDb.certificateTemplate.findFirst({
        where: { id: input.templateId, orgId: ctx.session.orgId },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "That certificate no longer exists." });
      const user = await ctx.rawDb.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      return issueCertificate(ctx.rawDb, {
        orgId: user.orgId,
        userId: input.userId,
        templateId: input.templateId,
        sourceKind: "manual",
        sourceTitle: template.name,
      });
    }),

  /** Revoking keeps the record so the public link reports "revoked" rather
   * than 404-ing — an issued credential disappearing entirely looks like a
   * mistake, not a deliberate action. The certificate lives in the
   * *recipient's* org, not the platform-admin caller's — `ctx.rawDb`
   * throughout, including the audit log entry, which is written into the
   * certificate's own org so that company's own audit trail reflects it. */
  revoke: requirePlatformAdmin
    .input(z.object({ certificateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const certificate = await ctx.rawDb.certificate.findUnique({ where: { id: input.certificateId } });
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND", message: "Certificate not found." });
      if (certificate.revoked) throw new TRPCError({ code: "CONFLICT", message: "This certificate is already revoked." });

      const updated = await ctx.rawDb.certificate.update({
        where: { id: input.certificateId },
        data: { revoked: true, revokedAt: new Date(), revokedByUserId: ctx.session.userId },
      });
      await ctx.rawDb.auditLogEntry.create({
        data: {
          orgId: certificate.orgId,
          actorUserId: ctx.session.userId,
          action: "certificate_revoked",
          summary: "Certificate revoked",
          targetLabel: certificate.sourceTitle,
        },
      });
      return updated;
    }),

  /** Permanent — the row is gone and the public verification link reports
   * "unknown" rather than "revoked", unlike `revoke` above. Same cross-org
   * pattern (`ctx.rawDb`, audit entry written into the certificate's own
   * org) since the certificate lives in the recipient's org, not the
   * platform-admin caller's. */
  delete: requirePlatformAdmin
    .input(z.object({ certificateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const certificate = await ctx.rawDb.certificate.findUnique({ where: { id: input.certificateId } });
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND", message: "Certificate not found." });

      await ctx.rawDb.certificate.delete({ where: { id: input.certificateId } });
      await ctx.rawDb.auditLogEntry.create({
        data: {
          orgId: certificate.orgId,
          actorUserId: ctx.session.userId,
          action: "certificate_deleted",
          summary: "Certificate permanently deleted",
          targetLabel: certificate.sourceTitle,
        },
      });
      return { ok: true };
    }),
});
