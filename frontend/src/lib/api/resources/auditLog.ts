import type { AuditActionType, AuditLogEntry } from "@/types/domain";
import { useDirectoryStore } from "@/state/directoryStore";
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

/**
 * Fire-and-forget append used by every mutating action that's worth a
 * compliance trail — role changes, deactivation, course lifecycle,
 * certificate revocation, org/plan changes. Silently no-ops if either id is
 * missing rather than throwing, since a caller reconstructing a stale
 * reference (e.g. a course already deleted) shouldn't crash the action that's
 * actually in progress.
 */
export function logAudit(
  orgId: string | undefined,
  actorUserId: string | undefined,
  action: AuditActionType,
  summary: string,
  targetLabel?: string,
  detail?: Record<string, string>,
): void {
  if (!orgId || !actorUserId) return;
  const entry: AuditLogEntry = {
    id: `audit_${crypto.randomUUID().slice(0, 8)}`,
    orgId,
    at: new Date().toISOString(),
    actorUserId,
    action,
    summary,
    targetLabel,
    detail,
  };
  useDirectoryStore.getState().addAuditEntry(entry);
}
