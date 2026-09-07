import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Yughma LMS",
  description: "How Yughma Technologies collects, uses, and protects your data.",
};

const LAST_UPDATED = "September 7, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-text-secondary">
      <Link href="/login" className="text-sm font-semibold text-accent hover:underline">
        ← Back to Yughma LMS
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-text-primary">Privacy Policy</h1>
      <p className="mt-1 text-sm text-text-tertiary">Last updated: {LAST_UPDATED}</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed">
        <p>
          Yughma Technologies (&quot;Yughma&quot;, &quot;we&quot;, &quot;us&quot;) operates Yughma
          LMS. This policy explains what data we collect from your organization and your
          learners, why we collect it, and what control you have over it.
        </p>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">
            Information we collect
          </h2>
          <p>
            Account information (name, email, role) provided when your organization is set up;
            usage data generated as you use the product (course progress, quiz attempts,
            certificates, logins); and content your organization uploads (courses, assignments,
            files). We do not sell this data to third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">How we use it</h2>
          <p>
            To operate the service (authenticate you, track learning progress, issue
            certificates, generate reports for your organization&apos;s admins), to communicate
            service-related notices, and to improve the product.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">Data retention</h2>
          <p>
            We retain account and learning-record data for as long as your organization&apos;s
            account is active, and as needed to comply with legal obligations, resolve disputes,
            and enforce our agreements.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">Your rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct, export, or
            request deletion of your personal data. Contact your organization&apos;s admin, or
            reach us directly, to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-text-primary">Contact</h2>
          <p>
            Questions about this policy? Reach out to your Yughma account team or the address
            provided in your organization&apos;s agreement.
          </p>
        </section>

        <p className="text-xs text-text-tertiary">
          This is a template policy and does not constitute legal advice — have it reviewed by
          counsel before relying on it for compliance (GDPR, CCPA, or otherwise).
        </p>
      </div>
    </div>
  );
}
