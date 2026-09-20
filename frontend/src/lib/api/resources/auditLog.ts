import type { AuditActionType, AuditLogEntry } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";

export interface AuditLogRow extends AuditLogEntry {
  actorName: string;
}

export interface AuditLogFilters {
  actorUserId?: string;
  action?: AuditActionType;
  /** Inclusive lower bound. */
  since?: string;
}

function toDateString(v: unknown): string {
  return v instanceof Date ? v.toISOString() : new Date(v as string).toISOString();
}

interface RawAuditLogEntry {
  id: string;
  orgId: string;
  at: unknown;
  actorUserId: string;
  action: unknown;
  summary: string;
  targetLabel: string | null;
  detail: unknown;
  actorName: string;
}

/**
 * Real backend-backed read side (see `backend/src/routers/auditLog.ts`) — the
 * `orgId` argument the mock signature took is dropped, since the backend
 * infers it from the caller's session and `AuditLogEntry` is directly
 * tenant-scoped there.
 */
export async function listAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogRow[]> {
  try {
    const raw = (await trpcClient.auditLog.list.query(filters)) as unknown as RawAuditLogEntry[];
    return raw.map(
      (e): AuditLogRow => ({
        id: e.id,
        orgId: e.orgId,
        at: toDateString(e.at),
        actorUserId: e.actorUserId,
        action: e.action as AuditActionType,
        summary: e.summary,
        targetLabel: e.targetLabel ?? undefined,
        detail: (e.detail as Record<string, string> | null) ?? undefined,
        actorName: e.actorName,
      }),
    );
  } catch (err) {
    throw toApiError(err);
  }
}

// There is deliberately no `logAudit` here anymore. It was a mock-era
// leftover that appended entries to a client-side Zustand store — so they
// lived in one browser tab's memory and vanished on refresh — and it had
// zero callers besides. Audit entries are written server-side by the
// mutations that cause them (see `courses.ts`'s publish/archive,
// `certificates.ts`'s revoke/delete, `platform.ts`), which is the only
// version that survives a reload or is visible to anyone else.
