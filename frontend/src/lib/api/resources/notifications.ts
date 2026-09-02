import type { NotificationCategory, NotificationItem, NotificationPreferences } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined } from "@/lib/api/serialization";

/**
 * Real backend-backed notifications resource client. `userId` arguments the
 * mock signatures took are dropped — the backend infers the caller from the
 * session (see `notifications.ts` router). The mock's fan-in `notify(...)`
 * helper is gone too: the router itself creates notifications directly where
 * needed (e.g. `communities.replyToThread`) now that it's real.
 */


export async function listNotifications(): Promise<NotificationItem[]> {
  try {
    const items = await trpcClient.notifications.mine.query();
    return items.map((n) => ({
      ...nullsToUndefined(n),
      createdAt: new Date(n.createdAt).toISOString(),
    })) as unknown as NotificationItem[];
  } catch (err) {
    throw toApiError(err);
  }
}

export async function markRead(id: string, read = true): Promise<void> {
  try {
    await trpcClient.notifications.markRead.mutate({ id, read });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function markAllRead(): Promise<void> {
  try {
    await trpcClient.notifications.markAllRead.mutate();
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getPreferences(): Promise<NotificationPreferences> {
  try {
    return (await trpcClient.notifications.getPreferences.query()) as NotificationPreferences;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updatePreferences(
  category: NotificationCategory,
  channel: "inApp" | "email",
  value: boolean,
): Promise<void> {
  try {
    await trpcClient.notifications.updatePreferences.mutate({ category, channel, value });
  } catch (err) {
    throw toApiError(err);
  }
}
