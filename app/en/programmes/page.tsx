// app/en/programmes/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProgramListSkeleton } from "@/components/Skeletons";
import { SITE_URL } from "@/lib/siteConfig";

// Dynamically import ProgramsTable with ProgramListSkeleton fallback
// Lazy loads on-demand to reduce main bundle size
// ProgramsTable is already a "use client" component, so no ssr: false needed
const ProgramsTable = dynamic(
  () => import("@/app/programmes/ProgramsTable").then((mod) => ({ default: mod.ProgramsTable })),
  {
    loading: () => <ProgramListSkeleton />,
  }
);

export const metadata: Metadata = {
  title: "Loyalty Programs — Miles & Points | KEZA",
  description:
    "Compare all airline loyalty programs: Air France-KLM Flying Blue, Emirates Skywards, British Airways Avios and more.",
  openGraph: {
    title: "Loyalty Programs — Miles & Points | KEZA",
    description:
      "Compare all airline loyalty programs: Air France-KLM Flying Blue, Emirates Skywards, British Airways Avios and more.",
    url: `${SITE_URL}/en/programmes`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Loyalty Programs — Miles & Points | KEZA",
    description:
      "Compare all airline loyalty programs: Air France-KLM Flying Blue, Emirates Skywards, British Airways Avios and more.",
  },
  alternates: {
    canonical: `${SITE_URL}/en/programmes`,
    languages: {
      fr: `${SITE_URL}/programmes`,
      en: `${SITE_URL}/en/programmes`,
      "x-default": `${SITE_URL}/programmes`,
    },
  },
};

export default function EnProgrammesPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link href="/en" className="text-xs text-muted hover:text-fg transition-colors">
          ← Back
        </Link>

        {/* Hero */}
        <div className="mt-6 mb-8 animate-fade-up">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Miles programs
            </span>
            <br />
            <span className="text-fg">Which program is actually worth it?</span>
          </h1>
          <p className="text-sm text-muted mt-3 max-w-xl">
            33 programs analyzed — airlines, hotels, transfer cards. KEZA Score based on mile value, available partners and redemption flexibility.
          </p>
          <p className="text-xs text-muted/60 mt-1">
            Updated: April 2026 · Sources: ThePointsGuy, NerdWallet, AwardWallet
          </p>
        </div>

        {/* Table */}
        <ErrorBoundary lang="en">
          <Suspense fallback={<ProgramListSkeleton />}>
            <ProgramsTable lang="en" />
          </Suspense>
        </ErrorBoundary>

        {/* Editorial note */}
        <div className="mt-10 bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-fg mb-2">How KEZA calculates the Score</h2>
          <p className="text-xs text-muted leading-relaxed">
            The KEZA Score (0–100) combines three criteria: the <strong className="text-fg">estimated mile value</strong> (50%) based on market valuations from ThePointsGuy and NerdWallet, the <strong className="text-fg">number of transfer partners</strong> (30%) which determines program feeding flexibility, and <strong className="text-fg">redemption flexibility</strong> (20%) evaluating how easy it is to secure premium seats. Values are updated manually 2 to 4 times per year.
          </p>
        </div>

      </div>
    </div>
  );
}
