import * as argon2 from "argon2";

/**
 * argon2id, never a plaintext comparison — see SECURITY_REVIEW.md's note on
 * the frontend mock's `MOCK_PASSWORD` string check, which must never be the
 * real pattern. argon2's defaults (argon2id, its own salt generation) are
 * sane; no manual tuning needed at this scale.
 */
export function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext);
}

export function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  return argon2.verify(hash, plaintext);
}
