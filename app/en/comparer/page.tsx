// app/en/comparer/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { ComparateurClient } from "@/app/comparer/ComparateurClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Compare Destinations — 3 Routes Side by Side | KEZA",
  description:
    "Compare up to 3 flight routes side by side. Cash price vs miles for each destination.",
  alternates: {
    canonical: `${SITE_URL}/en/comparer`,
    languages: {
      fr: `${SITE_URL}/comparer`,
      en: `${SITE_URL}/en/comparer`,
      "x-default": `${SITE_URL}/comparer`,
    },
  },
};

export default function EnComparateurPage() {
  return (
    <Suspense fallback={null}>
      <ComparateurClient />
    </Suspense>
  );
}
