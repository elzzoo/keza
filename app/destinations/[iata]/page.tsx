import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import { DestinationPageClient } from "./DestinationPageClient";

interface Props {
  params: { iata: string };
}

const BASE_URL = "https://keza-taupe.vercel.app";

export async function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ iata: d.iata.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dest = DESTINATIONS.find(
    (d) => d.iata.toLowerCase() === params.iata.toLowerCase()
  );
  if (!dest) return { title: "Destination not found — KEZA" };

  const title = `Vols Dakar → ${dest.city} — Cash ou Miles ? | KEZA`;
  const description = `Vols depuis Dakar (DSS) vers ${dest.city} (${dest.iata}). KEZA calcule si tes miles valent plus que le prix cash — estimation instantanée + recherche live.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/destinations/${dest.iata}`,
    },
    alternates: {
      canonical: `${BASE_URL}/destinations/${dest.iata}`,
    },
  };
}

export default function DestinationPage({ params }: Props) {
  const dest = DESTINATIONS.find(
    (d) => d.iata.toLowerCase() === params.iata.toLowerCase()
  );
  if (!dest) notFound();

  const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
  const recommendation = classifyDeal(cpm);
  const history = getMonthlyPrices(dest);

  const schema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: dest.city,
    description: `Vols depuis Dakar vers ${dest.city} — comparaison cash vs miles KEZA`,
    touristType: "Voyageur miles",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <DestinationPageClient
        dest={dest}
        cpm={cpm}
        recommendation={recommendation}
        history={history}
      />
    </>
  );
}
