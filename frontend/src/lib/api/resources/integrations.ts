import type { ApiKeyRecord, IntegrationKind, Webhook, WebhookDelivery, WebhookEvent } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";
import { ApiError } from "@/lib/api/errors";
import { assertSafeUrl } from "@/lib/api/validation";

/**
 * Real backend-backed integrations resource client. `orgId` arguments the
 * mock signatures took are dropped — `integrations.ts` router infers the
 * caller's org from `ctx.session` for every procedure. `ApiKeyRecord`'s real
 * key value is still only ever returned once, at creation (see
 * `createApiKey`) — never persisted or retrievable again, same as the mock.
 */



export interface IntegrationCard {
  kind: IntegrationKind;
  name: string;
  description: string;
}

/** One card shape for every integration — the 10th integration should cost a
 * data row, not a new page, per the module's open questions. */
export const INTEGRATION_CATALOG: IntegrationCard[] = [
  { kind: "slack", name: "Slack", description: "Team notifications" },
  { kind: "teams", name: "Microsoft Teams", description: "Team notifications" },
  { kind: "zoom", name: "Zoom", description: "Live sessions" },
  { kind: "google_calendar", name: "Google Calendar", description: "Calendar sync" },
  { kind: "hris", name: "HRIS Sync", description: "Directory sync" },
  { kind: "sso", name: "SSO", description: "Single sign-on" },
];

export interface IntegrationRow extends IntegrationCard {
  connected: boolean;
  config: Record<string, string>;
}

export async function listIntegrations(): Promise<IntegrationRow[]> {
  try {
    const existing: { kind: string; connected: boolean; config: unknown }[] =
      await trpcClient.integrations.listIntegrations.query();
    const rows: IntegrationRow[] = INTEGRATION_CATALOG.map((card) => {
      const found = existing.find((i) => i.kind === card.kind);
      const config = (found?.config ?? {}) as Record<string, string>;
      return { ...card, connected: found?.connected ?? false, config };
    });
    return rows;
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * OAuth-shaped, no real OAuth behind it — there's no third-party token
 * exchange yet. Records a connected state so the interaction pattern (and
 * the generic config panel underneath) is correct for when a real provider
 * lands.
 */
export async function connectIntegration(kind: IntegrationKind): Promise<void> {
  try {
    await trpcClient.integrations.connectIntegration.mutate({ kind });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function disconnectIntegration(kind: IntegrationKind): Promise<void> {
  try {
    await trpcClient.integrations.disconnectIntegration.mutate({ kind });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateIntegrationConfig(
  kind: IntegrationKind,
  config: Record<string, string>,
): Promise<void> {
  try {
    await trpcClient.integrations.updateIntegrationConfig.mutate({ kind, config });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listWebhooks(): Promise<Webhook[]> {
  try {
    const webhooks = await trpcClient.integrations.listWebhooks.query();
    return webhooks.map(
      (w) =>
        ({
          ...nullsToUndefined(toDateStrings(w, ["createdAt"])),
          deliveries: w.deliveries.map((d) => toDateStrings(d, ["at"]) as unknown as WebhookDelivery),
        }) as unknown as Webhook,
    );
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createWebhook(input: { url: string; events: WebhookEvent[] }): Promise<Webhook> {
  const url = assertSafeUrl(input.url, "Webhook URL");
  if (!url) throw new ApiError("validation", "Webhook URL is required.");
  if (input.events.length === 0) throw new ApiError("validation", "Pick at least one event.");

  try {
    const webhook = await trpcClient.integrations.createWebhook.mutate({ url, events: input.events });
    return {
      ...nullsToUndefined(toDateStrings(webhook, ["createdAt"])),
      deliveries: [],
    } as unknown as Webhook;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteWebhook(id: string): Promise<void> {
  try {
    await trpcClient.integrations.deleteWebhook.mutate({ id });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listWebhookDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
  try {
    const deliveries = await trpcClient.integrations.listWebhookDeliveries.query({ webhookId });
    return deliveries.map((d) => toDateStrings(d, ["at"]) as unknown as WebhookDelivery);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface CreateApiKeyResult {
  record: ApiKeyRecord;
  /** Only ever returned here, at creation — never persisted or retrievable again. */
  fullKey: string;
}

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  try {
    const keys = await trpcClient.integrations.listApiKeys.query();
    return keys.map((k) => nullsToUndefined(toDateStrings(k, ["createdAt", "lastUsedAt"])) as unknown as ApiKeyRecord);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createApiKey(name: string): Promise<CreateApiKeyResult> {
  if (!name.trim()) throw new ApiError("validation", "Name the key so you can tell it apart later.");
  try {
    const { record, fullKey } = await trpcClient.integrations.createApiKey.mutate({ name });
    return {
      record: nullsToUndefined(toDateStrings(record, ["createdAt", "lastUsedAt"])) as unknown as ApiKeyRecord,
      fullKey,
    };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function revokeApiKey(id: string): Promise<void> {
  try {
    await trpcClient.integrations.revokeApiKey.mutate({ id });
  } catch (err) {
    throw toApiError(err);
  }
}
