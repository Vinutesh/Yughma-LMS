import type { Permission } from "@/types/domain";

/** Resources that appear anywhere in the Manage-mode nav or its screens. */
export const RESOURCES = {
  courses: "courses",
  assignments: "assignments",
  reports: "reports",
  team: "team",
  users: "users",
  roles: "roles",
  settings: "settings",
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];

const ACTION_RANK = { view: 1, edit: 2, manage: 3 } as const;

/**
 * "manage" implies "edit" implies "view" for the same resource — matches
 * the Roles & Permissions module's matrix model (a checked higher-tier
 * action is a strict superset, not an independent toggle).
 */
export function hasPermission(
  permissions: Permission[],
  resource: Resource | string,
  action: Permission["action"],
): boolean {
  const needed = ACTION_RANK[action];
  return permissions.some(
    (p) => p.resource === resource && ACTION_RANK[p.action] >= needed,
  );
}
