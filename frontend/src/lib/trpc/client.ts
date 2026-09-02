import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "yughma-backend/src/routers/_app";

/**
 * A vanilla (non-React) tRPC client — the app's existing architecture already
 * routes every data call through plain async functions in
 * `lib/api/resources/*.ts`, called as `queryFn`/`mutationFn` by TanStack
 * Query directly. `createTRPCReact`'s own hooks would just be a second,
 * redundant integration layer on top of that; this is the client those
 * resource-client files call into instead of `useDirectoryStore`/
 * `useLearningStore`.
 *
 * Type-only import of `AppRouter` from the backend workspace package — never
 * bundled, just used to infer every procedure's input/output shape, so a
 * resource-client file can't call a procedure that doesn't exist or pass it
 * the wrong shape without a type error.
 */
const SESSION_TOKEN_KEY = "yughma-session-token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
  else localStorage.removeItem(SESSION_TOKEN_KEY);
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      // The backend now lives in this same Next.js app (see
      // src/app/api/trpc/[trpc]/route.ts) and deploys same-origin — a
      // relative path here works in both dev and production with no CORS
      // needed. `NEXT_PUBLIC_API_URL` stays overridable for anyone still
      // running the standalone server in backend/src/index.ts instead.
      url: process.env.NEXT_PUBLIC_API_URL ?? "/api/trpc",
      // Session travels as a Bearer header rather than a cookie — kept even
      // now that requests are same-origin, since switching to a cookie would
      // mean re-deriving CSRF protections this token-based approach doesn't
      // need; not worth the churn for this pass.
      headers() {
        const token = getSessionToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export { TRPCClientError };
