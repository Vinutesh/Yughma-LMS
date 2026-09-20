"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Award, Check, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/patterns/EmptyState";
import { SearchInput } from "@/components/patterns/SearchInput";
import { useSessionStore } from "@/state/sessionStore";
import { base64ToObjectUrl } from "@/lib/utils";
import * as certificatesApi from "@/lib/api/resources/certificates";
import { CertificateFace, formatLongDate } from "@/components/certificates/CertificateFace";

export default function MyCertificatesPage() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: allCertificates = [], isLoading } = useQuery({
    queryKey: ["myCertificates", userId],
    queryFn: () => certificatesApi.listMyCertificates(),
    enabled: !!userId,
  });

  const certificates = useMemo(
    () => allCertificates.filter((c) => c.templateName.toLowerCase().includes(search.toLowerCase())),
    [allCertificates, search],
  );

  const open = allCertificates.find((c) => c.id === openId) ?? null;

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
          <CertificatePdfButtons certificateId={open.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">My Certificates</h1>
      <p className="mb-4 text-sm text-text-tertiary">
        Everything you&apos;ve earned. Each one has a public link anyone can verify.
      </p>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search certificates..."
        aria-label="Search certificates"
        className="mb-4"
      />

      {allCertificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Finish a course or learning path that awards one and it'll appear here."
        />
      ) : certificates.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search." />
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

/** View opens the generated PDF in a new tab (the browser's own PDF viewer
 * handles zoom/print/its own download button from there); Download forces
 * a save under a real filename instead of relying on that viewer's UI. */
function CertificatePdfButtons({ certificateId }: { certificateId: string }) {
  const view = useMutation({
    mutationFn: () => certificatesApi.getCertificatePdf(certificateId),
    onSuccess: ({ base64 }) => window.open(base64ToObjectUrl(base64, "application/pdf"), "_blank"),
  });
  const download = useMutation({
    mutationFn: () => certificatesApi.getCertificatePdf(certificateId),
    onSuccess: ({ base64, filename }) => {
      const a = document.createElement("a");
      a.href = base64ToObjectUrl(base64, "application/pdf");
      a.download = filename;
      a.click();
    },
  });

  return (
    <>
      <Button variant="secondary" loading={view.isPending} onClick={() => view.mutate()}>
        View PDF
      </Button>
      <Button variant="secondary" loading={download.isPending} onClick={() => download.mutate()}>
        Download
      </Button>
    </>
  );
}
