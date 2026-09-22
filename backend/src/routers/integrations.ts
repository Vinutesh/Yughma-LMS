import crypto from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission } from "../trpc/trpc.js";
import { assertSafeUrl } from "../webhooks/urlSafety.js";
import { WEBHOOK_EVENTS } from "../webhooks/deliverWebhook.js";

/**
 * Mirrors `frontend/src/lib/api/resources/integrations.ts`. `Integration`
 * and `Webhook` are directly tenant-scoped (see tenantScope.ts), so they go
 * through `ctx.db` as usual. `WebhookDelivery` is NOT — it has no `orgId`
 * column of its own, only a `webhookId` pointing at its (scoped) parent — so
 * `listWebhookDeliveries` below resolves the parent `Webhook` through
 * `ctx.db` first (which 404s for a webhook from another org) and only then
 * queries deliveries by the now-verified `webhook.id`, never a second
 * unchecked id from the request. Same pattern as `roles.updatePermissions`.
 *
 * `ApiKeyRecord`'s real key value is only ever returned once, at creation —
 * never persisted in plaintext (only `maskedKey` + a `keyHash`) and never
 * returned by `list`.
 *
 * Delivery itself (`deliverWebhook.ts`) now actually fires these — see its
 * call sites in `courses.ts` and `certificates.ts` — but `assertSafeUrl`
 * still lives in `webhooks/urlSafety.ts`, shared between creation-time
 * validation here and delivery-time re-validation there, not duplicated.
 */

const INTEGRATION_KINDS = ["slack", "teams", "zoom", "google_calendar", "hris", "sso"] as const;

function maskKey(fullKey: string) {
  return `yu_••••${fullKey.slice(-4)}`;
}

export const integrationsRouter = router({
  listIntegrations: requirePermission("settings", "manage").query(({ ctx }) => ctx.db.integration.findMany({})),

  connectIntegration: requirePermission("settings", "manage")
    .input(z.object({ kind: z.enum(INTEGRATION_KINDS) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.integration.findFirst({ where: { kind: input.kind } });
      const data = { connected: true, connectedAt: new Date(), config: {} };
      if (existing) return ctx.db.integration.update({ where: { id: existing.id }, data });
      return ctx.db.integration.create({ data: { orgId: ctx.session.orgId, kind: input.kind, ...data } });
    }),

  disconnectIntegration: requirePermission("settings", "manage")
    .input(z.object({ kind: z.enum(INTEGRATION_KINDS) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.integration.findFirst({ where: { kind: input.kind } });
      const data = { connected: false, config: {} };
      if (existing) return ctx.db.integration.update({ where: { id: existing.id }, data });
      return ctx.db.integration.create({ data: { orgId: ctx.session.orgId, kind: input.kind, ...data } });
    }),

  updateIntegrationConfig: requirePermission("settings", "manage")
    .input(z.object({ kind: z.enum(INTEGRATION_KINDS), config: z.record(z.string(), z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.integration.findFirst({ where: { kind: input.kind } });
      if (!existing?.connected) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Connect the integration before configuring it." });
      }
      return ctx.db.integration.update({ where: { id: existing.id }, data: { config: input.config } });
    }),

  listWebhooks: requirePermission("settings", "manage").query(({ ctx }) =>
    ctx.db.webhook.findMany({
      orderBy: { createdAt: "desc" },
      include: { deliveries: { orderBy: { at: "desc" } } },
    }),
  ),

  createWebhook: requirePermission("settings", "manage")
    .input(z.object({ url: z.string().min(1), events: z.array(z.enum(WEBHOOK_EVENTS)).min(1) }))
    .mutation(({ ctx, input }) => {
      const url = assertSafeUrl(input.url, "Webhook URL");
      const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
      return ctx.db.webhook.create({ data: { orgId: ctx.session.orgId, url, events: input.events, secret } });
    }),

  deleteWebhook: requirePermission("settings", "manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // `ctx.db.webhook.delete` alone throws a raw Prisma "record not found"
      // (surfaced to the client as an opaque INTERNAL_SERVER_ERROR) rather
      // than a clean 404 when the scoped where-clause's orgId doesn't match
      // — resolve first, same pattern `listWebhookDeliveries` below already
      // uses, so a cross-org id gets a proper NOT_FOUND instead.
      const webhook = await ctx.db.webhook.findUnique({ where: { id: input.id } });
      if (!webhook) throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
      return ctx.db.webhook.delete({ where: { id: input.id } });
    }),

  /**
   * `WebhookDelivery` has no `orgId` — the parent `Webhook` is resolved
   * through `ctx.db` first (404s if it belongs to another org), and only
   * then are its deliveries fetched, by the verified `webhook.id`.
   */
  listWebhookDeliveries: requirePermission("settings", "manage")
    .input(z.object({ webhookId: z.string() }))
    .query(async ({ ctx, input }) => {
      const webhook = await ctx.db.webhook.findUnique({ where: { id: input.webhookId } });
      if (!webhook) throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
      return ctx.db.webhookDelivery.findMany({ where: { webhookId: webhook.id }, orderBy: { at: "desc" } });
    }),

  listApiKeys: requirePermission("settings", "manage").query(({ ctx }) =>
    ctx.db.apiKeyRecord.findMany({ orderBy: { createdAt: "desc" } }),
  ),

  createApiKey: requirePermission("settings", "manage")
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const fullKey = `yu_live_${crypto.randomUUID().replace(/-/g, "")}`;
      const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");
      const record = await ctx.db.apiKeyRecord.create({
        data: { orgId: ctx.session.orgId, name: input.name.trim(), maskedKey: maskKey(fullKey), keyHash },
      });
      // Only ever returned here, at creation — never persisted or retrievable again.
      return { record, fullKey };
    }),

  revokeApiKey: requirePermission("settings", "manage")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Same fix as `deleteWebhook` above: check existence first so a
      // cross-org id gets a clean NOT_FOUND instead of a raw Prisma
      // "record not found" surfacing as an opaque INTERNAL_SERVER_ERROR.
      const record = await ctx.db.apiKeyRecord.findUnique({ where: { id: input.id } });
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "API key not found." });
      return ctx.db.apiKeyRecord.update({ where: { id: input.id }, data: { revoked: true } });
    }),
});
