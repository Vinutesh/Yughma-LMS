"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSessionStore } from "@/state/sessionStore";
import * as certificatesApi from "@/lib/api/resources/certificates";
import { CertificateFace, formatLongDate } from "@/components/certificates/CertificateFace";

export default function MyCertificatesPage() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["myCertificates", userId],
    queryFn: () => certificatesApi.listMyCertificates(),
    enabled: !!userId,
  });

  const open = certificates.find((c) => c.id === openId) ?? null;

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading certificates...</p>;

  if (open) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <button
          onClick={() => setOpenId(null)}
          className="mb-4 text-sm font-medium text-accent hover:underline"
        >
          ← My Certificates
        </button>

        <CertificateFace certificate={open} />

        <div className="mt-4 flex items-center gap-2">
          <ShareLinkButton code={open.verificationCode} />
          {/* Real PDF generation is a fast-follow; the honest state is to say so
              rather than wire a button that silently does nothing. */}
          <Button variant="secondary" disabled title="PDF download — coming soon">
            Download
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">My Certificates</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        Everything you&apos;ve earned. Each one has a public link anyone can verify.
      </p>

      {certificates.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <Award className="size-6 text-text-tertiary" />
          <p className="text-sm font-semibold text-text-primary">No certificates yet</p>
          <p className="text-xs text-text-tertiary">
            Finish a course or pass an assessment that awards one and it&apos;ll appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {certificates.map((certificate) => (
            <Card
              key={certificate.id}
              className="cursor-pointer p-4 hover:border-border-strong"
              onClick={() => setOpenId(certificate.id)}
            >
              <Award className="mb-2 size-5 text-accent" />
              <p className="text-sm font-semibold text-text-primary">{certificate.templateName}</p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                Earned {formatLongDate(certificate.issuedAt)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Copies the public verification URL — the actual credibility payoff of the
 * module, so it's a real action rather than a display-only code. */
function ShareLinkButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/verify/${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked by permissions; still show the link so the
      // learner can copy it by hand rather than getting silent failure.
      window.prompt("Copy this verification link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" onClick={copy}>
      {copied ? (
        <>
          <Check className="size-4" /> Link copied
        </>
      ) : (
        "Share link"
      )}
    </Button>
  );
}
