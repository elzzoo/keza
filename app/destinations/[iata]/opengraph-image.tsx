// app/destinations/[iata]/opengraph-image.tsx
// og:image dynamique par destination.
// Affiche : ville, pays/IATA, miles, prix EUR, badge deal, meilleurs mois.
// Edge runtime — accès données statiques uniquement (DESTINATIONS, priceHistory).

import { ImageResponse } from "next/og";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import {
  ogWrapper,
  ogTopBar,
  ogBottomBar,
  OG_WIDTH,
  OG_HEIGHT,
} from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

type Props = { params: { iata: string } };

/** Badge colors per deal recommendation */
const BADGE_STYLES = {
  USE_MILES: {
    text: "Utilise tes miles",
    bg: "rgba(99,102,241,0.2)",
    border: "rgba(99,102,241,0.4)",
    color: "#818cf8",
  },
  USE_CASH: {
    text: "Utilise le cash",
    bg: "rgba(239,68,68,0.2)",
    border: "rgba(239,68,68,0.4)",
    color: "#f87171",
  },
  NEUTRAL: {
    text: "Neutre",
    bg: "rgba(107,114,128,0.2)",
    border: "rgba(107,114,128,0.4)",
    color: "#9ca3af",
  },
} as const;

export default async function Image({ params }: Props) {
  const dest = DESTINATIONS.find(
    (d) => d.iata.toLowerCase() === params.iata.toLowerCase()
  );

  // Fallback to brand image if destination not found
  if (!dest) {
    return new ImageResponse(
      ogWrapper(
        <>
          {ogTopBar("Comparateur de vols")}
          <div
            style={{ display: "flex", flexDirection: "column", position: "relative" }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: 68,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              Cash ou Miles ?
            </span>
          </div>
          {ogBottomBar("keza.app")}
        </>
      ),
      { width: OG_WIDTH, height: OG_HEIGHT }
    );
  }

  const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
  const recommendation = classifyDeal(cpm);
  const history = getMonthlyPrices(dest);
  const bestMonthLabels = history.bestMonths
    .slice(0, 3)
    .map((i) => history.monthlyPrices[i].monthLabel);

  const priceEur = Math.round(dest.cashEstimateUsd * 0.92);
  // toLocaleString not reliable in Edge — format manually
  const milesFormatted =
    dest.milesEstimate >= 1000
      ? Math.floor(dest.milesEstimate / 1000) +
        " " +
        String(dest.milesEstimate % 1000).padStart(3, "0")
      : String(dest.milesEstimate);

  const badge = BADGE_STYLES[recommendation];

  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Dakar \u2192 " + dest.city)}
        <div
          style={{ display: "flex", flexDirection: "column", position: "relative" }}
        >
          <span style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>
            {dest.country} · {dest.iata}
          </span>
          <span
            style={{
              color: "#ffffff",
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-2px",
              marginBottom: 20,
            }}
          >
            {dest.city}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#a5b4fc", fontSize: 22 }}>
              {milesFormatted} pts
            </span>
            <span style={{ color: "#4b5563", fontSize: 18 }}>·</span>
            <span style={{ color: "#a5b4fc", fontSize: 22 }}>~{priceEur}€</span>
            <div
              style={{
                display: "flex",
                background: badge.bg,
                border: "1px solid " + badge.border,
                borderRadius: 8,
                padding: "5px 14px",
                marginLeft: 8,
              }}
            >
              <span style={{ color: badge.color, fontSize: 14 }}>
                {badge.text}
              </span>
            </div>
          </div>
        </div>
        {ogBottomBar(
          bestMonthLabels.length > 0
            ? "Meilleurs mois : " + bestMonthLabels.join(" · ")
            : "keza.app"
        )}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
