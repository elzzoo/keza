import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices, type DestinationPriceHistory } from "@/lib/priceHistory";
import { DestinationPageClient } from "@/app/destinations/[iata]/DestinationPageClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logError } from "@/lib/logger";
import { SITE_URL as BASE_URL } from "@/lib/siteConfig";

interface Props {
  params: Promise<{ iata: string }>;
}

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ iata: d.iata.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { iata } = await params;
  const dest = DESTINATIONS.find(
    (d) => d.iata.toLowerCase() === iata.toLowerCase()
  );
  if (!dest) notFound();

  const title = `Flights from Dakar to ${dest.city} — Cash or Miles? | Xalifly`;
  const description = `Flights from Dakar (DSS) to ${dest.city} (${dest.iata}). Xalifly compares cash fares and miles redemptions for this Dakar route.`;
  const url = `${BASE_URL}/en/destinations/${dest.iata.toLowerCase()}`;
  const frUrl = `${BASE_URL}/destinations/${dest.iata.toLowerCase()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
      languages: {
        fr: frUrl,
        en: url,
        "x-default": frUrl,
      },
    },
  };
}

export default async function EnDestinationPage({ params }: Props) {
  const { iata } = await params;
  const dest = DESTINATIONS.find(
    (d) => d.iata.toLowerCase() === iata.toLowerCase()
  );
  if (!dest) notFound();

  const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
  const recommendation = classifyDeal(cpm);
  let history: DestinationPriceHistory;
  try {
    history = getMonthlyPrices(dest);
  } catch (err) {
    logError(`[/en/destinations/${dest.iata}] getMonthlyPrices failed:`, err);
    const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    history = {
      iata: dest.iata,
      monthlyPrices: MONTH_LABELS.map((label, i) => ({
        month: i,
        monthLabel: label,
        price: dest.cashEstimateUsd,
        cpm: computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate),
        recommendation,
      })),
      bestMonths: [0],
      worstMonths: [6],
    };
  }
  const priceUsd = Math.round(dest.cashEstimateUsd);

  const schema = {
    "@context": "https://schema.org",
    "@type": "TravelAction",
    name: `Dakar to ${dest.city} flights — Cash or Miles?`,
    description: `Compare cash fares (~$${priceUsd}) versus ${dest.milesEstimate.toLocaleString("en-US")} miles for a Dakar (DSS) to ${dest.city} (${dest.iata}) flight.`,
    fromLocation: {
      "@type": "Airport",
      name: "Blaise Diagne International Airport",
      iataCode: "DSS",
    },
    toLocation: {
      "@type": "Airport",
      name: dest.city,
      iataCode: dest.iata,
    },
    offers: {
      "@type": "Offer",
      price: priceUsd,
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ErrorBoundary lang="en">
        <DestinationPageClient
          dest={dest}
          cpm={cpm}
          recommendation={recommendation}
          history={history}
          initialLang="en"
        />
      </ErrorBoundary>
    </>
  );
}
