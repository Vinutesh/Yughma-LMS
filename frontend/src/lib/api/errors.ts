export type ApiErrorCode =
  | "invalid_credentials"
  | "locked_out"
  | "not_found"
  | "forbidden"
  | "validation"
  /** The request was well-formed but collides with existing state — a
   * duplicate name, an already-revoked certificate. */
  | "conflict";

export class ApiError extends Error {
  code: ApiErrorCode;
  /** For locked_out errors: when the caller may retry. */
  retryAt?: number;

  constructor(code: ApiErrorCode, message: string, retryAt?: number) {
    super(message);
    this.code = code;
    this.retryAt = retryAt;
  }
}
