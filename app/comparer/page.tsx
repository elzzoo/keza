import { Suspense } from "react";
import type { Metadata } from "next";
import { ComparateurClient } from "./ComparateurClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Comparer des destinations — Cash ou Miles ? | KEZA",
  description:
    "Comparez 2 ou 3 destinations depuis Dakar : cash, miles, CPM et meilleurs mois côte-à-côte.",
  alternates: { canonical: `${SITE_URL}/comparer` },
};

export default function ComparateurPage() {
  return (
    <Suspense fallback={null}>
      <ComparateurClient />
    </Suspense>
  );
}
