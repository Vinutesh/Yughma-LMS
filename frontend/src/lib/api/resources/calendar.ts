import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined } from "@/lib/api/serialization";
import { ApiError } from "@/lib/api/errors";
import { assertSafeUrl } from "@/lib/api/validation";

/**
 * Real backend-backed calendar resource client. `orgId`/`userId`/
 * `createdByUserId` arguments the mock signatures took are dropped — the
 * backend infers the caller's org and identity from the session, and derives
 * `canManage` itself from the caller's own permissions rather than trusting
 * it as an argument (see `calendar.ts` router's `hasEditPermission`).
 */


export type CalendarItemKind = "deadline" | "assessment_window" | "manual";

export interface CalendarItem {
  id: string;
  kind: CalendarItemKind;
  title: string;
  at: string;
  courseTitle?: string;
  targetUrl?: string;
  description?: string;
  link?: string;
  createdByUserId?: string;
  eventId?: string;
}

export async function listMyCalendar(): Promise<CalendarItem[]> {
  try {
    const items = await trpcClient.calendar.list.query();
    return items.map((item) => ({
      ...nullsToUndefined(item),
      at: new Date(item.at).toISOString(),
    })) as unknown as CalendarItem[];
  } catch (err) {
    throw toApiError(err);
  }
}

export interface CreateEventInput {
  courseId?: string;
  title: string;
  description?: string;
  startsAt: string;
  link?: string;
}

export async function createEvent(input: CreateEventInput) {
  if (!input.title.trim()) throw new ApiError("validation", "Give the event a title.");
  if (!input.startsAt) throw new ApiError("validation", "Pick a date and time.");
  try {
    const event = await trpcClient.calendar.create.mutate({
      ...input,
      startsAt: new Date(input.startsAt),
      link: assertSafeUrl(input.link, "Event link"),
    });
    return nullsToUndefined(event);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateEvent(
  eventId: string,
  patch: Partial<{ title: string; description: string; startsAt: string; link: string }>,
): Promise<void> {
  if (patch.title !== undefined && !patch.title.trim()) {
    throw new ApiError("validation", "Give the event a title.");
  }
  const safePatch = "link" in patch ? { ...patch, link: assertSafeUrl(patch.link, "Event link") } : patch;
  try {
    await trpcClient.calendar.update.mutate({
      eventId,
      ...safePatch,
      startsAt: safePatch.startsAt !== undefined ? new Date(safePatch.startsAt) : undefined,
    });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    await trpcClient.calendar.delete.mutate({ eventId });
  } catch (err) {
    throw toApiError(err);
  }
}
