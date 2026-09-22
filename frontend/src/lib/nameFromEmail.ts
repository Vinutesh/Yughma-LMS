/** A display name is required on a new account, so seed it from the email's
 * local part ("manish.naik@..." → "Manish Naik") rather than leaving it
 * blank — callers that let the person edit it afterward should still do so;
 * this is just a starting guess. */
export function nameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
