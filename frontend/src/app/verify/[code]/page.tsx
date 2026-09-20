"use client";

import { use } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CircleCheck, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import * as certificatesApi from "@/lib/api/resources/certificates";
import { formatLongDate } from "@/components/certificates/CertificateFace";
import { base64ToObjectUrl } from "@/lib/utils";

/**
 * Public, no-login certificate verification — the external-credibility payoff
 * of the Certificates module. Deliberately outside both route groups: no shell
 * chrome, no auth guard, nothing that assumes a session.
 */
export default function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["verify", code],
    queryFn: () => certificatesApi.verifyCode(decodeURIComponent(code)),
  });

  const view = useMutation({
    mutationFn: () => certificatesApi.getCertificatePdfByCode(decodeURIComponent(code)),
    onSuccess: ({ base64 }) => window.open(base64ToObjectUrl(base64, "application/pdf"), "_blank"),
  });
  const download = useMutation({
    mutationFn: () => certificatesApi.getCertificatePdfByCode(decodeURIComponent(code)),
    onSuccess: ({ base64, filename }) => {
      const a = document.createElement("a");
      a.href = base64ToObjectUrl(base64, "application/pdf");
      a.download = filename;
      a.click();
    },
  });

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-border px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-text-primary">
          <Image src="/mark-64.png" alt="" width={20} height={20} className="rounded-[5px]" />
          Yughma LMS
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          {isLoading && <p className="text-sm text-text-tertiary">Checking this certificate...</p>}

          {data?.status === "valid" && (
            <>
              <CircleCheck className="mx-auto mb-3 size-8 text-success" />
              <p className="text-base font-semibold text-success">This certificate is valid</p>
              <p className="mt-5 text-lg text-text-primary">
                <span className="font-semibold">{data.certificate.recipientName}</span> completed{" "}
                <span className="font-semibold">{data.certificate.sourceTitle}</span>
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                on {formatLongDate(data.certificate.issuedAt)}
              </p>
              <p className="mt-4 text-xs text-text-tertiary">
                Issued by {data.certificate.orgName} via Yughma LMS
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Verification code:{" "}
                <span className="font-mono font-semibold tracking-wide">
                  {data.certificate.verificationCode}
                </span>
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" loading={view.isPending} onClick={() => view.mutate()}>
                  View PDF
                </Button>
                <Button variant="secondary" size="sm" loading={download.isPending} onClick={() => download.mutate()}>
                  Download
                </Button>
              </div>
            </>
          )}

          {data?.status === "revoked" && (
            <>
              <AlertTriangle className="mx-auto mb-3 size-8 text-warning" />
              <p className="text-base font-semibold text-warning">
                This certificate has been revoked
              </p>
              <p className="mt-3 text-xs text-text-tertiary">
                Verification code:{" "}
                <span className="font-mono font-semibold tracking-wide">{data.code}</span>
              </p>
            </>
          )}

          {data?.status === "unknown" && (
            <>
              <HelpCircle className="mx-auto mb-3 size-8 text-text-tertiary" />
              <p className="text-base font-semibold text-text-primary">
                No certificate matches this code
              </p>
              <p className="mt-2 text-sm text-text-tertiary">
                Check the code was copied correctly.
              </p>
              <p className="mt-3 text-xs text-text-tertiary">
                Code checked:{" "}
                <span className="font-mono font-semibold tracking-wide">{data.code}</span>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
