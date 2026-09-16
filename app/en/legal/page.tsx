import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal Notice — Xalifly",
  description: "Legal information for Xalifly.",
};

export default function LegalNotice() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        <Link
          href="/en"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="text-3xl font-black text-fg mb-8">Legal Notice</h1>

        <div className="space-y-8 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Publisher</h2>
            <p>Xalifly is an online service for comparing flight prices paid in cash vs miles.</p>
            <p className="mt-2">Publisher: KEZA Inc. (registration in progress, Delaware, United States)</p>
            <p className="mt-2">
              Contact: <a href="mailto:contact@keza.app" className="text-primary hover:underline">contact@keza.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Hosting</h2>
            <p>Hosted by Vercel Inc., 340 Pine Street, Suite 900, San Francisco, CA 94104, United States.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Data Protection</h2>
            <p>
              Under applicable privacy rules, including GDPR where relevant, users may request access,
              correction, or deletion of their personal data by contacting{" "}
              <a href="mailto:privacy@keza.app" className="text-primary hover:underline">privacy@keza.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Intellectual Property</h2>
            <p>
              Text, graphics, logos, icons, and software available on Xalifly are protected by intellectual
              property laws. Reproduction or distribution is prohibited without prior authorization.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Price Data</h2>
            <p>
              Prices shown on Xalifly are indicative and may come from third-party sources. Xalifly does not
              guarantee their accuracy, completeness, or freshness. Final prices may change at booking time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Liability</h2>
            <p>
              Xalifly is a comparison service and does not sell airline tickets. Users remain responsible for
              their booking choices and for verifying final prices with the airline or travel provider.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Governing Law</h2>
            <p>
              This legal notice is governed by the laws of the State of Delaware, United States. Users located
              in the European Union also benefit from applicable GDPR protections.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
