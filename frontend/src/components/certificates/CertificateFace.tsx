import { Award } from "lucide-react";
import type { CertificateView } from "@/lib/api/resources/certificates";

/**
 * The one fixed certificate layout — v1 ships no visual designer, so every
 * certificate renders through this component with only its variable fields
 * differing (see LMS/docs/modules/15-certificates/00-open-questions.md).
 * Shared by the learner's detail view and the public verification page so the
 * two can never drift.
 *
 * Gold is used nowhere else in the app — it's reserved for this one moment
 * (see globals.css's `--gold-*` tokens) so it reads as earned rather than
 * decorative.
 */
export function CertificateFace({ certificate }: { certificate: CertificateView }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-gold/40 bg-surface p-10 text-center shadow-(--shadow-token-md)">
      <div className="pointer-events-none absolute inset-3 rounded-md border border-gold/25" aria-hidden />

      <div className="relative flex flex-col items-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-gold-bg">
          <Award className="size-7 text-gold-bg-fg" aria-hidden />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary">
          {certificate.orgName}
        </p>
        <p className="mt-3 font-display text-xl font-bold text-text-primary">Certificate of Completion</p>

        <div className="my-6 h-px w-16 bg-gold/50" />

        <p className="text-xs text-text-tertiary">This certifies that</p>
        <p className="mt-1.5 font-display text-2xl font-bold text-text-primary">{certificate.recipientName}</p>
        <p className="mt-3 text-sm text-text-secondary">
          has completed <span className="font-medium text-text-primary">{certificate.sourceTitle}</span>
        </p>
        <p className="mt-1 text-sm text-text-secondary">on {formatLongDate(certificate.issuedAt)}</p>

        <div className="my-6 h-px w-16 bg-gold/50" />

        <p className="text-xs text-text-tertiary">
          Verification code:{" "}
          <span className="font-mono font-semibold tracking-wide text-text-secondary">
            {certificate.verificationCode}
          </span>
        </p>
      </div>
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
