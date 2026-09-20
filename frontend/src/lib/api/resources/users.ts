import type { User } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";

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

export interface InviteResult {
  email: string;
  status: "invited" | "failed";
  /** Returned only on success — the generated temp password, shown once so
   * it can be relayed by hand if the welcome email doesn't land. */
  tempPassword?: string;
  /** False when the account was created but the welcome email was rejected
   * (an unverified sending domain is the usual cause) — the account works
   * either way, but the password then has to be passed along by hand. */
  emailSent?: boolean;
  /** Returned only on failure, e.g. the address is already in use. */
  message?: string;
}

/**
 * Adds each person to the caller's own org. Sequential, not parallel, and
 * per-person fault tolerant: one bad address (already registered, say)
 * reports against just that row instead of failing everyone else's
 * invite — the dialog shows the outcome line by line.
 */
export async function inviteUsers(
  entries: { name: string; email: string; roleId: string | null }[],
): Promise<InviteResult[]> {
  const results: InviteResult[] = [];
  for (const entry of entries) {
    try {
      const { tempPassword, emailSent } = await trpcClient.users.create.mutate(entry);
      results.push({ email: entry.email, status: "invited", tempPassword, emailSent });
    } catch (err) {
      results.push({ email: entry.email, status: "failed", message: toApiError(err).message });
    }
  }
  return results;
}

/** Permanently removes someone from the admin's own org. Throws with a
 * readable reason when it's refused — deleting yourself, deleting the last
 * account that can manage users, or a person whose authored content still
 * blocks the delete. */
export async function deleteUser(userId: string): Promise<void> {
  try {
    await trpcClient.users.delete.mutate({ userId });
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * Issues a fresh temporary password for someone in the admin's own org —
 * the only recovery path there is, since self-service reset doesn't exist
 * yet. Returns the password to relay by hand, plus whether the email
 * actually went out.
 */
export async function resetUserPassword(userId: string): Promise<{ tempPassword: string; emailSent: boolean }> {
  try {
    return await trpcClient.users.resetPassword.mutate({ userId });
  } catch (err) {
    throw toApiError(err);
  }
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
