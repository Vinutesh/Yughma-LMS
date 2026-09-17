import type { Department, Organization, Team } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined } from "@/lib/api/serialization";

/**
 * Real backend-backed organizations resource client. Every mutation now
 * targets "my org" via the caller's session server-side — the `orgId`
 * arguments the mock signatures took are dropped, since accepting one here
 * at all would be exactly the cross-tenant hole `organizations.ts` router's
 * doc comment warns about. No call site passed anything but the caller's own
 * org anyway.
 */


export async function updateOrgGeneral(
  patch: Partial<Pick<Organization, "name" | "industry" | "size">>,
): Promise<void> {
  try {
    await trpcClient.organizations.updateGeneral.mutate(patch);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface DepartmentWithTeams extends Department {
  teams: Team[];
  memberCount: number;
}

export async function listDepartments(): Promise<DepartmentWithTeams[]> {
  try {
    const departments = await trpcClient.organizations.listDepartments.query();
    return departments.map((d) => nullsToUndefined(d) as unknown as DepartmentWithTeams);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createDepartment(name: string): Promise<Department> {
  try {
    const d = await trpcClient.organizations.createDepartment.mutate({ name });
    return nullsToUndefined(d) as unknown as Department;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createTeam(departmentId: string, name: string): Promise<Team> {
  try {
    const t = await trpcClient.organizations.createTeam.mutate({ departmentId, name });
    return nullsToUndefined(t) as unknown as Team;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function archiveDepartment(id: string): Promise<void> {
  try {
    await trpcClient.organizations.archiveDepartment.mutate({ id });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function archiveTeam(id: string): Promise<void> {
  try {
    await trpcClient.organizations.archiveTeam.mutate({ id });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateOrgBranding(
  patch: Partial<Pick<Organization, "logoUrl" | "accentColor">>,
): Promise<void> {
  try {
    await trpcClient.organizations.updateBranding.mutate(patch);
  } catch (err) {
    throw toApiError(err);
  }
}

/** Two steps, same pattern as `content.uploadAsset`: ask the backend for a
 * signed upload URL, PUT the file straight to R2, then persist the
 * resulting storage key via `updateOrgBranding`. Overwrites any previous
 * logo — one fixed key per org (see `requestLogoUpload`'s own doc comment). */
export async function uploadOrgLogo(file: File): Promise<void> {
  try {
    const { uploadUrl, storageKey } = await trpcClient.organizations.requestLogoUpload.mutate({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    });
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new Error("Upload failed.");
    await trpcClient.organizations.updateBranding.mutate({ logoUrl: storageKey });
  } catch (err) {
    throw toApiError(err);
  }
}

/** The bucket is private, so this mints a fresh short-lived signed URL each
 * call — call it again rather than caching the result past its expiry
 * (react-query's own `staleTime` handles that for callers, see `TopBar`). */
export async function getOrgLogoUrl(): Promise<string | null> {
  try {
    const { url } = await trpcClient.organizations.getLogoUrl.query();
    return url;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateOrgSecurity(
  patch: Partial<Pick<Organization, "sessionTimeoutHours" | "requireSso">>,
): Promise<void> {
  try {
    await trpcClient.organizations.updateSecurity.mutate(patch);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface OrgInventory {
  userCount: number;
  courseCount: number;
  certificateCount: number;
}

/** Backs the Delete Organization confirm — a real inventory pulled from the
 * org's own data, not a generic warning, so the stakes are concrete. */
export async function getOrgInventory(): Promise<OrgInventory> {
  try {
    return await trpcClient.organizations.inventory.query();
  } catch (err) {
    throw toApiError(err);
  }
}
