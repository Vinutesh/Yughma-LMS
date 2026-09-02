import type { User } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { ApiError } from "@/lib/api/errors";

/**
 * Real backend-backed users resource client. `orgId` arguments from the old
 * mock signatures are dropped where the backend now infers "my org" from the
 * caller's own session (see `organizations.ts` router's doc comment on why
 * that's a security boundary, not a convenience) — every screen already only
 * ever passes the caller's own org here, so no call site needs updating.
 *
 * Audit-log and notification side effects the mock version fired on every
 * mutation are not reproduced here: those routers don't exist on the real
 * backend yet (see BACKEND_PLAN.md's migration order). Once they do, they
 * belong server-side in the resolver, not bolted back onto this client.
 */

type BackendUser = {
  id: string;
  name: string;
  email: string;
  orgId: string;
  status: "active" | "deactivated";
  departmentId: string | null;
  teamId: string | null;
  roles: { role: { id: string } }[];
};

function toUser(u: BackendUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    orgId: u.orgId,
    status: u.status,
    departmentId: u.departmentId ?? undefined,
    teamId: u.teamId ?? undefined,
    roleIds: u.roles.map((ur) => ur.role.id),
  };
}

export async function listUsers(): Promise<User[]> {
  try {
    const users = await trpcClient.users.list.query();
    return users.map(toUser);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface InviteEntry {
  email: string;
  roleId: string;
  departmentId?: string;
  teamId?: string;
}

export interface InviteResult {
  email: string;
  status: "invited" | "already_member";
}

/** No real-backend equivalent yet — see `users.ts` router's comment on
 * `invite`. Throws rather than silently no-opping so the Invite screen's
 * error state is visible instead of looking like a hang. */
export async function inviteUsers(): Promise<InviteResult[]> {
  throw new ApiError("validation", "Inviting new members isn't available yet — check back soon.");
}

/** "Change role" sets the account's one non-Learner (Manage-mode) role —
 * Learner itself stays implicit on every account. Passing `null` clears any
 * Manage-mode role, the real equivalent of the mock's `"role_learner"`
 * sentinel (see `users.ts` router's doc comment). */
export async function updateUserRole(userId: string, roleId: string | null): Promise<void> {
  try {
    await trpcClient.users.updateRole.mutate({ userId, roleId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateUserAssignment(
  userId: string,
  departmentId?: string,
  teamId?: string,
): Promise<void> {
  try {
    await trpcClient.users.updateAssignment.mutate({
      userId,
      departmentId: departmentId ?? null,
      teamId: teamId ?? null,
    });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deactivateUser(userId: string): Promise<void> {
  try {
    await trpcClient.users.deactivate.mutate({ userId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function reactivateUser(userId: string): Promise<void> {
  try {
    await trpcClient.users.reactivate.mutate({ userId });
  } catch (err) {
    throw toApiError(err);
  }
}
