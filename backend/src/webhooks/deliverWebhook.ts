import crypto from "node:crypto";
import dns from "node:dns/promises";
import type { rawPrisma } from "../db.js";
import { assertSafeUrl, isPrivateOrLoopbackHost } from "./urlSafety.js";

type RawDb = typeof rawPrisma;

export const WEBHOOK_EVENTS = ["course.published", "certificate.issued", "enrollment.completed"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Fires every one of an org's webhooks subscribed to `event`, best-effort —
 * a receiver being down or unreachable must never fail the mutation that
 * triggered it (a certificate must still issue even if nobody's listening on
 * the other end). Every attempt is recorded as a `WebhookDelivery` row
 * (`statusCode` 0 means "never actually sent" — blocked by the safety check
 * or a network-level failure, distinct from any real HTTP status), so a
 * failed delivery is a visible row an admin can see via
 * `listWebhookDeliveries`, not a silent drop.
 *
 * There is deliberately no retry/backoff here yet — `WebhookDelivery` has no
 * `status`/`attempts`/`nextRetryAt` to drive one. A failed delivery today is
 * terminal; see this repo's Phase 1 plan for why that's an accepted, explicit
 * limitation rather than an oversight.
 */
export async function deliverWebhook(
  db: RawDb,
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  let webhooks: { id: string; url: string; secret: string }[];
  try {
    webhooks = await db.webhook.findMany({ where: { orgId, events: { has: event } } });
  } catch {
    return; // Lookup failure must not break the caller either.
  }
  await Promise.all(webhooks.map((webhook) => deliverOne(db, webhook, event, payload)));
}

/**
 * Re-validates the URL and, crucially, re-resolves DNS and checks the
 * *resolved* address immediately before connecting — `assertSafeUrl` at
 * webhook-creation time only ever saw the hostname the admin typed, so a
 * domain that resolves to a private/loopback address only now (DNS
 * rebinding) would otherwise slip straight past a check done once, days
 * earlier. See `urlSafety.ts`'s own doc comment for the full threat model.
 */
async function deliverOne(
  db: RawDb,
  webhook: { id: string; url: string; secret: string },
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({ event, payload, at: new Date().toISOString() });
  let statusCode = 0;

  try {
    const url = assertSafeUrl(webhook.url, "Webhook URL");
    const parsed = new URL(url);
    const resolved = await dns.lookup(parsed.hostname);
    // `dns.lookup` returns a bare address ("::1", not "[::1]") — normalize
    // to the bracketed form `isPrivateOrLoopbackHost` expects for IPv6.
    const resolvedHost = resolved.family === 6 ? `[${resolved.address}]` : resolved.address;

    if (!isPrivateOrLoopbackHost(resolvedHost)) {
      const signature = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Yughma-Signature": signature },
        body,
        signal: AbortSignal.timeout(8000),
      });
      statusCode = res.status;
    }
  } catch {
    statusCode = 0;
  }

  await db.webhookDelivery.create({ data: { webhookId: webhook.id, event, statusCode } }).catch(() => {});
}
