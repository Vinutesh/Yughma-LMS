import type { CertificateView } from "@/lib/api/resources/certificates";

/**
 * The one fixed certificate layout — v1 ships no visual designer, so every
 * certificate renders through this component with only its variable fields
 * differing (see LMS/docs/modules/15-certificates/00-open-questions.md).
 * Shared by the learner's detail view and the public verification page so the
 * two can never drift.
 */
export function CertificateFace({ certificate }: { certificate: CertificateView }) {
  return (
    <div className="rounded-lg border-2 border-border-strong bg-surface p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary">
        {certificate.orgName}
      </p>
      <p className="mt-3 text-lg font-semibold text-text-primary">Certificate of Completion</p>

      <div className="mx-auto my-6 h-px w-16 bg-border" />

      <p className="text-xs text-text-tertiary">This certifies that</p>
      <p className="mt-1.5 text-2xl font-semibold text-text-primary">{certificate.recipientName}</p>
      <p className="mt-3 text-sm text-text-secondary">
        has completed <span className="font-medium text-text-primary">{certificate.sourceTitle}</span>
      </p>
      <p className="mt-1 text-sm text-text-secondary">on {formatLongDate(certificate.issuedAt)}</p>

      <div className="mx-auto my-6 h-px w-16 bg-border" />

      <p className="text-xs text-text-tertiary">
        Verification code:{" "}
        <span className="font-mono font-semibold tracking-wide text-text-secondary">
          {certificate.verificationCode}
        </span>
      </p>
    </div>
  );
}

export function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
