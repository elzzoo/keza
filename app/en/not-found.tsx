import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found | Xalifly",
  description: "This page does not exist. Return to Xalifly to compare cash fares vs miles.",
  robots: "noindex",
};

export default function EnNotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-8 flex flex-col items-center gap-1">
        <span className="text-4xl font-black leading-none">
          <span className="text-primary">Xali</span>
          <span className="text-fg">fly</span>
        </span>
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          Cash or Miles?
        </span>
      </div>

      <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6">
        <span className="text-3xl font-black text-primary">404</span>
      </div>

      <h1 className="text-2xl font-black text-fg mb-2">Page not found</h1>
      <p className="text-sm text-muted max-w-sm mb-8">
        This page does not exist or has moved. Return home to find the best option for your next flight.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/en"
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Back home
        </Link>
        <Link
          href="/en/deals"
          className="px-6 py-2.5 rounded-xl bg-surface border border-border text-fg text-sm font-semibold hover:bg-surface-2 transition-colors"
        >
          See current deals
        </Link>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
        {[
          { href: "/en/programmes", label: "Miles programs" },
          { href: "/en/carte", label: "Destination map" },
          { href: "/en/comparer", label: "Compare" },
          { href: "/en/alertes", label: "My alerts" },
        ].map(({ href, label }) => (
          <Link key={href} href={href} className="hover:text-fg transition-colors">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
