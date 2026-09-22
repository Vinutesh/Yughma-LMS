import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";

/** A learner's own private scratchpad for one lesson — see `Note`'s own
 * schema comment. One row per (user, lesson), not a list of entries. */
export async function getNote(lessonId: string): Promise<string> {
  try {
    const { body } = await trpcClient.notes.get.query({ lessonId });
    return body;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function saveNote(lessonId: string, body: string): Promise<void> {
  try {
    await trpcClient.notes.save.mutate({ lessonId, body });
  } catch (err) {
    throw toApiError(err);
  }
}
