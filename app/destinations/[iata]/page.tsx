import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import { DestinationPageClient } from "./DestinationPageClient";

interface Props {
  params: { iata: string };
}

import { SITE_URL as BASE_URL } from "@/lib/siteConfig";

export async function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ iata: d.iata.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dest = DESTINATIONS.find(
    (d) => d.iata.toLowerCase() === params.iata.toLowerCase()
  );
  if (!dest) notFound();

  const title = `Vols Dakar → ${dest.city} — Cash ou Miles ? | KEZA`;
  const description = `Vols depuis Dakar (DSS) vers ${dest.city} (${dest.iata}). KEZA calcule si tes miles valent plus que le prix cash — estimation instantanée + recherche live.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/destinations/${dest.iata.toLowerCase()}`,
    },
    alternates: {
      canonical: `${BASE_URL}/destinations/${dest.iata.toLowerCase()}`,
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
  const priceEur = Math.round(dest.cashEstimateUsd * 0.92);

  const schema = {
    "@context": "https://schema.org",
    "@type": "TravelAction",
    name: `Vol Dakar \u2192 ${dest.city} \u2014 Cash ou Miles ?`,
    description: `Comparer le prix cash (~${priceEur}\u20ac) versus ${dest.milesEstimate.toLocaleString("fr-FR")} miles pour un vol Dakar (DSS) \u2192 ${dest.city} (${dest.iata}).`,
    fromLocation: {
      "@type": "Airport",
      name: "A\u00e9roport International Blaise Diagne",
      iataCode: "DSS",
    },
    toLocation: {
      "@type": "Airport",
      name: dest.city,
      iataCode: dest.iata,
    },
    offers: {
      "@type": "Offer",
      price: priceEur,
      priceCurrency: "EUR",
    },
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
