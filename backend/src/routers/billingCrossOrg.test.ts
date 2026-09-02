import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./_app.js";
import { rawPrisma } from "../db.js";
import { scopedPrisma } from "../trpc/tenantScope.js";
import type { Context } from "../trpc/context.js";

/**
 * Same class of check as `organizations.test.ts` / `learningCrossOrg.test.ts`,
 * applied to the billing/integrations/scorm routers added in this pass.
 *
 * `Organization` billing fields (plan, seat limit, subscription status,
 * payment method, ...) are updated via `ctx.session.orgId`, never an id
 * argument — `billing.choosePlan` is checked the same way
 * `organizations.test.ts` checks `updateGeneral`.
 *
 * `WebhookDelivery` is the unscoped child in this pass (no direct `orgId` —
 * see tenantScope.ts): `integrations.listWebhookDeliveries` must resolve the
 * parent `Webhook` through `ctx.db` first, so org A can't read org B's
 * webhook's delivery log by id.
 */
describe("cross-org protection — billing/integrations/scorm routers", () => {
  let orgAId: string;
  let orgBId: string;
  let adminAId: string;
  let adminARoleId: string;

  let webhookB: { id: string };

  function ctxFor(userId: string, orgId: string, roleIds: string[]): Context {
    return { session: { userId, orgId, roleIds }, db: scopedPrisma(orgId), rawDb: rawPrisma };
  }

  beforeAll(async () => {
    const orgA = await rawPrisma.organization.create({ data: { name: "Billing cross-org test — org A" } });
    const orgB = await rawPrisma.organization.create({ data: { name: "Billing cross-org test — org B" } });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const adminRole = await rawPrisma.role.create({
      data: {
        orgId: orgAId,
        name: "Admin",
        permissions: { create: [{ resource: "settings", action: "manage" }] },
      },
    });
    const admin = await rawPrisma.user.create({
      data: { orgId: orgAId, name: "Admin A", email: "admin@org-a-billingtest.test", passwordHash: "x" },
    });
    await rawPrisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
    adminAId = admin.id;
    adminARoleId = adminRole.id;

    webhookB = await rawPrisma.webhook.create({
      data: { orgId: orgBId, url: "https://hooks.example.com/b", events: ["course.published"], secret: "whsec_b" },
    });
    await rawPrisma.webhookDelivery.create({
      data: { webhookId: webhookB.id, event: "course.published", statusCode: 200 },
    });
  });

  afterAll(async () => {
    await rawPrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await rawPrisma.$disconnect();
  });

  function callerA() {
    return appRouter.createCaller(ctxFor(adminAId, orgAId, [adminARoleId]));
  }

  it("choosePlan only ever touches the caller's own org, ignoring any id in the input shape", async () => {
    const updated = await callerA().billing.choosePlan({ planId: "growth", seatLimit: 500 });
    expect(updated.id).toBe(orgAId);
    expect(updated.plan).toBe("growth");

    const orgBUnchanged = await rawPrisma.organization.findUnique({ where: { id: orgBId } });
    expect(orgBUnchanged?.plan).toBeNull();
  });

  it("cancelSubscription only ever cancels the caller's own org", async () => {
    await callerA().billing.cancelSubscription();
    const orgA = await rawPrisma.organization.findUnique({ where: { id: orgAId } });
    expect(orgA?.cancelAtPeriodEnd).toBe(true);

    const orgBUnchanged = await rawPrisma.organization.findUnique({ where: { id: orgBId } });
    expect(orgBUnchanged?.cancelAtPeriodEnd).toBe(false);
  });

  it("org A cannot read org B's webhook delivery log by id", async () => {
    await expect(
      callerA().integrations.listWebhookDeliveries({ webhookId: webhookB.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("org A cannot delete org B's webhook by id", async () => {
    await expect(callerA().integrations.deleteWebhook({ id: webhookB.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const stillExists = await rawPrisma.webhook.findUnique({ where: { id: webhookB.id } });
    expect(stillExists).not.toBeNull();
  });
});
