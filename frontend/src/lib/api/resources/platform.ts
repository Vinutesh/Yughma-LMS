import type { Organization, Role, User } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";

/**
 * Platform-admin-only operations — every call here hits a `platform.*`
 * procedure gated by `requirePlatformAdmin` on the backend (a separate,
 * stricter check than the usual per-permission one; see `trpc.ts`'s doc
 * comment). Only ever call these when `session.org.isPlatform` is true —
 * the backend enforces this regardless, this is just the UI-side gate that
 * keeps the option from showing up for anyone else.
 */

export async function listClientOrgs(): Promise<Organization[]> {
  try {
    const orgs = await trpcClient.platform.listClientOrgs.query();
    return orgs.map((o) => nullsToUndefined(o)) as unknown as Organization[];
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createClientOrg(input: {
  name: string;
  industry?: string;
  size?: string;
}): Promise<{ org: Organization; roles: Role[] }> {
  try {
    const result = await trpcClient.platform.createClientOrg.mutate(input);
    return {
      org: nullsToUndefined(result.org) as unknown as Organization,
      roles: result.roles as unknown as Role[],
    };
  } catch (err) {
    throw toApiError(err);
  }
}

export interface ClientUser extends User {
  createdAt: string;
}

export async function listClientUsers(orgId: string): Promise<ClientUser[]> {
  try {
    const users = await trpcClient.platform.listClientUsers.query({ orgId });
    return users.map((u) => ({
      ...nullsToUndefined(u),
      roleIds: u.roles.map((ur) => ur.role.id),
      createdAt: new Date(u.createdAt).toISOString(),
    })) as unknown as ClientUser[];
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listClientOrgRoles(orgId: string): Promise<Role[]> {
  try {
    const roles = await trpcClient.platform.listClientOrgRoles.query({ orgId });
    return roles as unknown as Role[];
  } catch (err) {
    throw toApiError(err);
  }
}

/** Returns the temporary password in the response — the only place it's
 * ever visible. There's no invite-email flow yet, so it must be relayed to
 * the person directly. */
export async function createClientUser(input: {
  orgId: string;
  name: string;
  email: string;
  roleId: string | null;
}): Promise<{ user: User; tempPassword: string }> {
  try {
    const result = await trpcClient.platform.createClientUser.mutate(input);
    return {
      user: nullsToUndefined({ ...result.user, roleIds: [] }) as unknown as User,
      tempPassword: result.tempPassword,
    };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function grantCourseAccess(userId: string, courseId: string): Promise<void> {
  try {
    await trpcClient.platform.grantCourseAccess.mutate({ userId, courseId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function revokeCourseAccess(userId: string, courseId: string): Promise<void> {
  try {
    await trpcClient.platform.revokeCourseAccess.mutate({ userId, courseId });
  } catch (err) {
    throw toApiError(err);
  }
}

export interface CourseGrant {
  enrollmentId: string;
  status: string;
  enrolledAt: string;
  completedAt?: string;
  userId: string;
  userName: string;
  userEmail: string;
  orgId: string;
  orgName: string;
}

export async function listCourseGrants(courseId: string): Promise<CourseGrant[]> {
  try {
    const grants = await trpcClient.platform.listCourseGrants.query({ courseId });
    return grants.map((g) => toDateStrings(nullsToUndefined(g), ["enrolledAt", "completedAt"])) as unknown as CourseGrant[];
  } catch (err) {
    throw toApiError(err);
  }
}
