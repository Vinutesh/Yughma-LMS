import { scopedPrisma } from "./tenantScope.js";
import { rawPrisma } from "../db.js";
import { resolveSession } from "../auth/session.js";

export type ScopedDb = ReturnType<typeof scopedPrisma>;

export interface Session {
  userId: string;
  orgId: string;
  /** Role names, resolved once at session-creation and re-checked on
   * mutations that matter (deactivation, role changes) — never trusted as
   * the sole authorization source for anything destructive. */
  roleIds: string[];
}

export interface Context {
  session: Session | null;
  /** The raw session token, if one was presented — needed by `logout` to
   * delete the specific session row rather than every session for the user. */
  token?: string;
  /**
   * Tenant-scoped Prisma client — undefined until a session exists, since
   * there's no orgId to scope to before that. Every resolver on an
   * authenticated procedure gets this from `ctx`, never `rawDb`.
   */
  db?: ScopedDb;
  /**
   * The *unscoped* client. Only ever touched by code that has no single-org
   * concept by definition — session/account lookup during login, before an
   * orgId is known. Reaching for this anywhere else is very likely the tenant-
   * isolation bug this whole module exists to prevent; if a resolver needs
   * it, that's a sign the resolver is wrong, not that this escape hatch is
   * the right tool.
   */
  rawDb: typeof rawPrisma;
}

/**
 * Resolves a session token (from the request's Authorization header or
 * cookie — see index.ts for where this gets called from) into a real,
 * database-backed `Context`. `token` is `undefined` for an unauthenticated
 * request, which is valid — `publicProcedure`s (like `auth.login`) run with
 * `session: null`.
 */
export async function createContext(token: string | undefined): Promise<Context> {
  const session = await resolveSession(token);
  return {
    session,
    token,
    db: session ? scopedPrisma(session.orgId) : undefined,
    rawDb: rawPrisma,
  };
}
