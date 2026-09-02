import type { Certificate, CertificateTemplate } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";

/**
 * Real backend-backed certificates resource client. Issuance itself now
 * happens server-side (see `certificates.ts` router's exported
 * `issueCertificate`, called from `courses.ts`'s `setLessonComplete`) — this
 * file only covers what the UI calls directly: templates, listing, manual
 * issue, revoke, and public verification.
 */

function toDateStrings<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): T {
  const out: Record<string, unknown> = { ...obj };
  for (const key of keys) {
    const v = out[key as string];
    if (v instanceof Date) out[key as string] = v.toISOString();
    else if (typeof v === "string") out[key as string] = new Date(v).toISOString();
    else if (v == null) out[key as string] = undefined;
  }
  return out as T;
}

export interface CertificateView extends Certificate {
  templateName: string;
  recipientName: string;
  orgName: string;
}

function toCertificateView(c: Record<string, unknown>): CertificateView {
  return toDateStrings(c, ["issuedAt", "revokedAt"]) as unknown as CertificateView;
}

export async function listTemplates(): Promise<CertificateTemplate[]> {
  try {
    const templates = await trpcClient.certificates.listTemplates.query();
    return templates.map((t) => ({ ...t, createdAt: new Date(t.createdAt).toISOString() }));
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createTemplate(name: string): Promise<CertificateTemplate> {
  try {
    const t = await trpcClient.certificates.createTemplate.mutate({ name });
    return { ...t, createdAt: new Date(t.createdAt).toISOString() };
  } catch (err) {
    throw toApiError(err);
  }
}

/** Admin, cross-course view — newest first. */
export async function listCertificates(): Promise<CertificateView[]> {
  try {
    const certificates = await trpcClient.certificates.list.query();
    return certificates.map(toCertificateView);
  } catch (err) {
    throw toApiError(err);
  }
}

/** The learner's own wallet. Revoked certificates drop out of it. */
export async function listMyCertificates(): Promise<CertificateView[]> {
  try {
    const certificates = await trpcClient.certificates.mine.query();
    return certificates.map(toCertificateView);
  } catch (err) {
    throw toApiError(err);
  }
}

export type VerificationResult =
  | { status: "valid"; certificate: CertificateView }
  | { status: "revoked"; code: string }
  | { status: "unknown"; code: string };

/** Backs the public, no-login verification page. */
export async function verifyCode(rawCode: string): Promise<VerificationResult> {
  try {
    const result = await trpcClient.certificates.verifyCode.query({ code: rawCode });
    if (result.status === "valid") return { status: "valid", certificate: toCertificateView(result.certificate) };
    return result;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function issueManually(input: { userId: string; templateId: string }): Promise<Certificate> {
  try {
    const c = await trpcClient.certificates.issueManually.mutate(input);
    return toDateStrings(c, ["issuedAt", "revokedAt"]) as unknown as Certificate;
  } catch (err) {
    throw toApiError(err);
  }
}

/** Revoking keeps the record so the public link reports "revoked" rather than
 * 404-ing — an issued credential disappearing entirely looks like a mistake. */
export async function revokeCertificate(certificateId: string): Promise<void> {
  try {
    await trpcClient.certificates.revoke.mutate({ certificateId });
  } catch (err) {
    throw toApiError(err);
  }
}
