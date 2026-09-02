"use client";

import { useSessionStore } from "@/state/sessionStore";
import { hasPermission, type Resource } from "@/config/permissions";
import type { Permission } from "@/types/domain";

/** True if the current session can perform `action` on `resource`. */
export function usePermission(resource: Resource, action: Permission["action"]) {
  const permissions = useSessionStore((s) => s.session?.permissions ?? []);
  return hasPermission(permissions, resource, action);
}

/** True if the account holds any permission at all beyond the base Learner
 * role — i.e. whether the mode switch should render (Shell Journey 1). */
export function useHasManageAccess() {
  const permissions = useSessionStore((s) => s.session?.permissions ?? []);
  return permissions.length > 0;
}
