import type { LrsConnection, XapiStatement } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";

/**
 * Real backend-backed SCORM/xAPI resource client. `orgId` arguments the
 * mock signatures took are dropped — `scorm.ts` router infers the caller's
 * org from `ctx.session`. Still a read-only debug/compliance surface, same
 * as the mock — there is no real SCORM package processing or live LRS
 * behind this.
 */



export interface XapiStatementRow extends XapiStatement {
  actorName: string;
}

export async function listXapiStatements(): Promise<XapiStatementRow[]> {
  try {
    const statements = await trpcClient.scorm.listStatements.query();
    return statements.map((s) => toDateStrings(s, ["at"]) as unknown as XapiStatementRow);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getLrsConnection(): Promise<LrsConnection> {
  try {
    const connection = await trpcClient.scorm.getLrsConnection.query();
    return nullsToUndefined(connection) as unknown as LrsConnection;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function saveLrsConnection(input: { endpointUrl: string; authKey: string }): Promise<void> {
  try {
    await trpcClient.scorm.saveLrsConnection.mutate(input);
  } catch (err) {
    throw toApiError(err);
  }
}

/** Issues a fresh, single-use-session launch URL for a SCORM lesson —
 * re-checks enrollment server-side every time this is called, same as
 * video/file playback. Call this each time the player mounts; don't cache
 * the URL across lessons or reloads. */
export async function getScormLaunchUrl(lessonId: string): Promise<{ url: string; crossOrigin: boolean }> {
  try {
    return await trpcClient.scorm.getLaunchUrl.mutate({ lessonId });
  } catch (err) {
    throw toApiError(err);
  }
}
