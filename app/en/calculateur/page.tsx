// app/en/calculateur/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { MILES_PRICES } from "@/data/milesPrices";
import { getForexRate } from "@/lib/autoCalibrate";
import { CalculateurClient } from "@/app/calculateur/CalculateurClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Miles Calculator — Is It Worth Redeeming? | Xalifly",
  description:
    "Calculate the value of your miles and points. Find out if redeeming miles beats the cash price.",
  openGraph: {
    title: "Miles Calculator — Is It Worth Redeeming? | Xalifly",
    description:
      "Calculate the value of your miles and points. Find out if redeeming miles beats the cash price.",
    url: `${SITE_URL}/en/calculateur`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Miles Calculator — Is It Worth Redeeming? | Xalifly",
    description:
      "Calculate the value of your miles and points. Find out if redeeming miles beats the cash price.",
  },
  alternates: {
    canonical: `${SITE_URL}/en/calculateur`,
    languages: {
      fr: `${SITE_URL}/calculateur`,
      en: `${SITE_URL}/en/calculateur`,
      "x-default": `${SITE_URL}/calculateur`,
    },
  },
};

export default async function EnCalculateurPage() {
  const forexRate = await getForexRate().catch(() => 605);
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/en" className="text-xs text-muted hover:text-fg transition-colors">← Back</Link>
          <h1 className="text-3xl font-black mt-4 mb-2">
            <span className="text-primary">Miles</span> value calculator
          </h1>
          <p className="text-muted text-sm">
            Discover how much your miles are worth depending on the program and redemption type.
          </p>
        </div>

        <ErrorBoundary lang="en">
          <CalculateurClient programs={MILES_PRICES} forexRate={forexRate} lang="en" />
        </ErrorBoundary>

        <div className="mt-10 bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold text-fg">
              Reference value by program
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Market values — sources: ThePointsGuy, NerdWallet, AwardWallet
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Program</th>
                <th className="text-right px-5 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Value / mile</th>
                <th className="text-right px-5 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {MILES_PRICES.map((p) => (
                <tr key={p.program} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3 font-medium text-fg">{p.program}</td>
                  <td className="px-5 py-3 text-right font-bold text-primary">{p.valueCents.toFixed(1)}¢</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.confidence === "HIGH"   ? "bg-success/10 text-success" :
                      p.confidence === "MEDIUM" ? "bg-warning/10 text-warning" :
                                                  "bg-surface-2 text-muted"
                    }`}>
                      {p.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
