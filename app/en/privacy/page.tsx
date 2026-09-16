import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Xalifly",
  description: "Xalifly privacy policy and personal data protection.",
};

export default function PrivacyPolicy() {
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

        <h1 className="text-3xl font-black text-fg mb-8">Privacy Policy</h1>

        <div className="space-y-8 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Introduction</h2>
            <p>
              Xalifly is committed to protecting user privacy. This policy explains which data we collect,
              how we use it, and the rights available to users under applicable privacy rules.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Data We Collect</h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong className="text-fg">Flight searches</strong>: origin, destination, dates, and cabin. Search preferences may be stored locally on your device.</li>
              <li><strong className="text-fg">Email address</strong>: only when you create a price alert, and only to send alert notifications.</li>
              <li><strong className="text-fg">Usage data</strong>: anonymous page and performance analytics used to improve the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Cookies and Local Storage</h2>
            <p>
              Xalifly stores preferences such as language, currency, and theme locally in your browser.
              These preferences can be cleared from your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">How We Use Data</h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Provide cash-vs-miles flight comparison results</li>
              <li>Send price alert notifications when requested</li>
              <li>Improve the reliability, performance, and usability of the service</li>
            </ul>
            <p className="mt-2">We do not sell or rent personal data.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Third-Party Services</h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong className="text-fg">Vercel</strong>: hosting and performance infrastructure</li>
              <li><strong className="text-fg">Upstash</strong>: caching and alert storage</li>
              <li><strong className="text-fg">Resend</strong>: transactional email delivery</li>
              <li><strong className="text-fg">Sentry</strong>: error monitoring and diagnostics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Retention</h2>
            <p>
              Price alerts are retained until unsubscribe or inactivity cleanup. Anonymous analytics and
              operational logs are retained only as long as needed to operate and improve the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Your Rights</h2>
            <p>
              You may request access, correction, export, or deletion of your personal data by contacting{" "}
              <a href="mailto:privacy@keza.app" className="text-primary hover:underline">privacy@keza.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Updates</h2>
            <p>This policy may be updated as the product evolves. Last updated: September 2026.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
