import type { Permission, Role } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";

/**
 * Real backend-backed roles resource client. The self-lockout guard the mock
 * enforced client-side against `sessionStore` is no longer duplicated here —
 * the `roles.ts` router re-checks it server-side against the caller's real
 * session (see its doc comment), which is the actual enforcement boundary;
 * this client just surfaces whatever `FORBIDDEN` it returns as an `ApiError`.
 */

function asPermission(p: { resource: string; action: string }): Permission {
  return p as Permission;
}

function toRole(r: { id: string; name: string; isSystemRole: boolean; permissions: { resource: string; action: string }[] }): Role {
  return { ...r, permissions: r.permissions.map(asPermission) };
}

export async function listRoles(): Promise<Role[]> {
  try {
    const roles = await trpcClient.roles.list.query();
    return roles.map(toRole);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createRole(name: string, cloneFromRoleId: string | null): Promise<Role> {
  try {
    const role = await trpcClient.roles.create.mutate({ name, cloneFromRoleId });
    return toRole(role);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateRolePermissions(roleId: string, permissions: Permission[]): Promise<void> {
  try {
    await trpcClient.roles.updatePermissions.mutate({ roleId, permissions });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteRole(roleId: string): Promise<void> {
  try {
    await trpcClient.roles.delete.mutate({ roleId });
  } catch (err) {
    throw toApiError(err);
  }
}
