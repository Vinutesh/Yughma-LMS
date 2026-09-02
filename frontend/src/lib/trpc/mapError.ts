import { TRPCClientError } from "@trpc/client";
import { ApiError, type ApiErrorCode } from "@/lib/api/errors";

/**
 * Every resource-client function still throws the app's own `ApiError` —
 * every component that catches `err instanceof ApiError` to show `err.message`
 * (and, for lockout, `err.retryAt`) keeps working unchanged whether the call
 * underneath is mock-store or real network. This is the one place that
 * translates a tRPC error into that shape.
 */
const CODE_MAP: Record<string, ApiErrorCode> = {
  UNAUTHORIZED: "invalid_credentials",
  TOO_MANY_REQUESTS: "locked_out",
  NOT_FOUND: "not_found",
  FORBIDDEN: "forbidden",
  CONFLICT: "conflict",
  BAD_REQUEST: "validation",
};

export function toApiError(err: unknown): ApiError {
  if (err instanceof TRPCClientError) {
    const trpcCode = (err.data as { code?: string } | undefined)?.code ?? "INTERNAL_SERVER_ERROR";
    const code = CODE_MAP[trpcCode] ?? "validation";
    const retryAt = (err.data as { retryAt?: number } | undefined)?.retryAt;
    return new ApiError(code, err.message, retryAt);
  }
  if (err instanceof ApiError) return err;
  return new ApiError("validation", "Something went wrong. Please try again.");
}
