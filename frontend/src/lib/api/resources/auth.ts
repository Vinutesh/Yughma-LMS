import type { Permission, Session } from "@/types/domain";
import { trpcClient, setSessionToken } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined } from "@/lib/api/serialization";

/**
 * Real backend-backed auth resource client. Same function names/shapes the
 * mock version had, so nothing upstream (sessionStore, components) needs to
 * change beyond what the mock→real swap itself requires.
 *
 * The backend's session payload omits each role's `permissions`-derived
 * `roleIds` on the user object (Postgres has no such denormalized column) —
 * reconstructed here from the roles array so `User.roleIds` keeps meaning
 * what every existing screen already assumes it means.
 */

type BackendSession = {
  user: {
    id: string;
    name: string;
    email: string;
    orgId: string;
    status: "active" | "deactivated";
    mustChangePassword: boolean;
  };
  org: Record<string, unknown> & { id: string; name: string; isPlatform: boolean };
  roles: { id: string; name: string; isSystemRole: boolean; permissions: { resource: string; action: string }[] }[];
  permissions: { resource: string; action: string }[];
};

/** `Permission.action` is a plain `string` column in Postgres — the seed
 * script and every router only ever write "view"/"edit"/"manage" into it,
 * so this narrows rather than validates. A real invalid value here is a
 * data bug to fix at the source, not something to handle gracefully here. */
function asPermission(p: { resource: string; action: string }): Permission {
  return p as Permission;
}

function toSession(backend: BackendSession): Session {
  return {
    ...backend,
    org: nullsToUndefined(backend.org) as Session["org"],
    roles: backend.roles.map((r) => ({ ...r, permissions: r.permissions.map(asPermission) })),
    permissions: backend.permissions.map(asPermission),
    user: { ...backend.user, roleIds: backend.roles.map((r) => r.id) },
  };
}

export async function login(email: string, password: string): Promise<Session> {
  try {
    const result = await trpcClient.auth.login.mutate({ email, password });
    setSessionToken(result.token);
    return toSession(result.session);
  } catch (err) {
    throw toApiError(err);
  }
}

// There is deliberately no `signup` anymore — every company account and
// every learner account is created by a Yughma Tech platform admin (see
// `platform.ts`'s resource client), never self-service. See
// `backend/src/routers/auth.ts`'s matching comment for why.

export async function logout(): Promise<void> {
  try {
    await trpcClient.auth.logout.mutate();
  } catch {
    // Best-effort — the token gets cleared client-side regardless below, and
    // a session that failed to explicitly delete server-side will simply
    // expire on its own.
  } finally {
    setSessionToken(null);
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await trpcClient.auth.changePassword.mutate({ currentPassword, newPassword });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function me(): Promise<Session> {
  try {
    const result = await trpcClient.auth.me.query();
    return toSession(result);
  } catch (err) {
    throw toApiError(err);
  }
}
