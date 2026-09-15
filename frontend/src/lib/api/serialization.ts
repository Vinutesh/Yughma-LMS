/**
 * Shared conversion helpers used by every real-backend resource-client file
 * under `lib/api/resources/` — extracted here after the same two function
 * bodies were copy-pasted into 15+ files during the mock→real migration.
 * Only genuinely identical implementations were consolidated; a couple of
 * files (`assignments.ts`, `certificates.ts`) keep their own slightly
 * different local variant rather than being forced onto this shared one,
 * since unifying those would have been a behavior change, not just a
 * cleanup.
 */

/** Prisma reports an absent nullable column as `null`; every domain type in
 * `types/domain.ts` models "absent" as `undefined`. Converting at this one
 * boundary keeps that convention intact everywhere else in the app. */
export function nullsToUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) out[key] = value === null ? undefined : value;
  return out as T;
}

/** tRPC's default JSON transport carries Prisma `Date` fields as either a
 * real `Date` (same-process type, pre-serialization) or an ISO string
 * (post-wire) depending on where in the call chain this runs — so both
 * shapes are normalized to an ISO string here rather than assuming one. */
export function toDateStrings<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): T {
  const out: Record<string, unknown> = { ...obj };
  for (const key of keys) {
    const v = out[key as string];
    if (v instanceof Date) out[key as string] = v.toISOString();
    else if (typeof v === "string") out[key as string] = new Date(v).toISOString();
  }
  return out as T;
}
