import { TRPCError } from "@trpc/server";

/**
 * Shared by webhook creation (`integrations.ts`) and delivery
 * (`deliverWebhook.ts`) — creation checks the hostname a caller typed;
 * delivery re-checks the *resolved* IP immediately before connecting, since a
 * hostname is only ever a promise about where a request will go, never a
 * guarantee. See `deliverWebhook.ts`'s own doc comment for why both checks
 * are necessary, not redundant.
 */
export function isPrivateOrLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") return true;

  // IPv4 literal, dotted-quad only (DNS names are checked by suffix above;
  // resolving arbitrary hostnames to catch DNS rebinding is the delivery-time
  // job described above, not this one).
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0) return true; // loopback / private / "this network"
    if (a === 169 && b === 254) return true; // link-local (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    return false;
  }

  // IPv6 loopback / unique-local / link-local literals, e.g. "[::1]".
  if (host === "[::1]" || host === "::1") return true;
  if (host.startsWith("[fc") || host.startsWith("[fd") || host.startsWith("[fe80")) return true;

  return false;
}

export function assertSafeUrl(url: string, fieldLabel = "URL"): string {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${fieldLabel} must be a full URL, like https://example.com.` });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${fieldLabel} must start with http:// or https://.` });
  }
  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${fieldLabel} can't point at a private or local address.` });
  }
  return url.trim();
}
