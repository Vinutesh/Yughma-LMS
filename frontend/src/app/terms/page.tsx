import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Yughma LMS",
  description: "The terms governing use of Yughma LMS.",
};

const LAST_UPDATED = "September 7, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-text-secondary">
      <Link href="/login" className="text-sm font-semibold text-accent hover:underline">
        ← Back to Yughma LMS
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-text-primary">Terms &amp; Conditions</h1>
      <p className="mt-1 text-sm text-text-tertiary">Last updated: {LAST_UPDATED}</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed">
        <p>
          These terms govern your organization&apos;s and your users&apos; access to and use of
          Yughma LMS, operated by Yughma Technologies. By using the service, you agree to these
          terms.
        </p>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">Accounts</h2>
          <p>
            Company accounts and individual learner accounts are provisioned by Yughma or by your
            organization&apos;s administrators. You&apos;re responsible for keeping your login
            credentials confidential and for activity that happens under your account.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">Acceptable use</h2>
          <p>
            You agree not to use the service to upload unlawful content, infringe on
            intellectual property, attempt to bypass access controls, or interfere with the
            service&apos;s normal operation.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">Content ownership</h2>
          <p>
            Your organization retains ownership of the courses, assignments, and other content it
            uploads. You grant Yughma the license needed to host, process, and display that
            content back to your organization&apos;s users as part of the service.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">
            Availability &amp; changes
          </h2>
          <p>
            We aim for high availability but don&apos;t guarantee uninterrupted access. We may
            update these terms or the service from time to time; material changes will be
            communicated to your organization&apos;s admins.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">
            Limitation of liability
          </h2>
          <p>
            The service is provided &quot;as is&quot;. To the extent permitted by law, Yughma
            isn&apos;t liable for indirect, incidental, or consequential damages arising from use
            of the service.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">Contact</h2>
          <p>
            Questions about these terms? Reach out to your Yughma account team or the address
            provided in your organization&apos;s agreement.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">Grievance Officer</h2>
          <p>
            As required under the Information Technology (Intermediary Guidelines and Digital
            Media Ethics Code) Rules, 2021:
          </p>
          <p className="mt-2">
            [Grievance Officer Name]
            <br />
            Yughma Technologies
            <br />
            Email: tech@yughma.com
          </p>
        </section>

        <p className="text-xs text-text-tertiary">
          This is a template agreement and does not constitute legal advice — have it reviewed by
          counsel before relying on it as a binding contract.
        </p>
      </div>
    </div>
  );
}
