"use client";

/**
 * Retired: this used to impersonate another seeded account with no password,
 * which only made sense against the mock store. The real backend has real
 * sessions and password auth, so there's no equivalent to switch to.
 * Rendering `null` (rather than deleting the component and its import in
 * `TopBar.tsx`) so a real, audited "view as" admin feature has an obvious
 * place to land if one is ever deliberately built.
 */
export function DevRoleSwitcher() {
  return null;
}
