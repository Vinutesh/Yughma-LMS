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
  if (certificate.backgroundUrl && certificate.overlayLayout) {
    return <CustomCertificateFace certificate={certificate} />;
  }
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

/** Renders an admin-uploaded background design with the three dynamic
 * fields dropped at their saved {x,y} percentages (set via the drag-to-
 * position tool in Manage > Certificates) instead of the fixed layout
 * above. The verification code prints below the design rather than over
 * it, since its position isn't part of what the admin placed. */
function CustomCertificateFace({ certificate }: { certificate: CertificateView }) {
  const layout = certificate.overlayLayout!;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-full overflow-hidden rounded-lg border border-border shadow-(--shadow-token-md)">
        {/* Aspect ratio matches a standard landscape certificate export;
            the image itself still scales to the actual upload's ratio. */}
        <img src={certificate.backgroundUrl} alt="" className="block w-full" />
        <OverlayText position={layout.name} text={certificate.recipientName} />
        <OverlayText position={layout.course} text={certificate.sourceTitle} />
        <OverlayText position={layout.date} text={formatLongDate(certificate.issuedAt)} />
      </div>
      <p className="text-xs text-text-tertiary">
        Verification code:{" "}
        <span className="font-mono font-semibold tracking-wide text-text-secondary">
          {certificate.verificationCode}
        </span>
      </p>
    </div>
  );
}

function OverlayText({ position, text }: { position: { x: number; y: number }; text: string }) {
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[3.2vw] font-semibold text-slate-900 sm:text-lg"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {text}
    </span>
  );
}

/** DD/MM/YYYY, per client request — kept the same exported name since every
 * caller (certificates page, manage certificates, verify page) just wants
 * "the certificate date," not specifically a long-form one anymore. */
export function formatLongDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}
