import { ImageResponse } from "next/og";
import { ogWrapper, ogTopBar, ogBottomBar, OG_WIDTH, OG_HEIGHT } from "@/lib/og-templates";
import { airportsMap } from "@/data/airports";
import { fetchCalendarPrices } from "@/lib/engine";

export const runtime = "edge";
export const revalidate = 21600;
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

interface Props {
  params: { route: string };
}

function parseRoute(route: string) {
  const match = route.match(/^([A-Z]{3})-([A-Z]{3})$/i);
  if (!match) return null;
  return { from: match[1].toUpperCase(), to: match[2].toUpperCase() };
}

export default async function Image({ params }: Props) {
  const parsed = parseRoute(params.route);

  const from = parsed?.from ?? "???";
  const to = parsed?.to ?? "???";
  const fromAirport = airportsMap[from];
  const toAirport = airportsMap[to];
  const fromCity = fromAirport?.city ?? fromAirport?.cityEn ?? from;
  const toCity = toAirport?.city ?? toAirport?.cityEn ?? to;
  const fromFlag = fromAirport?.flag ?? "🌍";
  const toFlag = toAirport?.flag ?? "🌍";

  // Try to get a live price for the current month
  let cheapestPrice: number | null = null;
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prices = await fetchCalendarPrices(from, to, month);
    if (prices.length > 0) {
      cheapestPrice = Math.min(...prices.map((p) => p.price));
    }
  } catch { /* no price available */ }

  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Cash ou Miles ?")}

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, justifyContent: "center" }}>
          {/* Route */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* From */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 52 }}>{fromFlag}</span>
              <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 700, letterSpacing: "0.1em" }}>{from}</span>
            </div>

            {/* Arrow */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
                <div style={{ flex: 1, height: 2, background: "rgba(99,102,241,0.4)", display: "flex" }} />
                <span style={{ fontSize: 24, color: "#6366f1", margin: "0 12px" }}>✈</span>
                <div style={{ flex: 1, height: 2, background: "rgba(99,102,241,0.4)", display: "flex" }} />
              </div>
            </div>

            {/* To */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 52 }}>{toFlag}</span>
              <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 700, letterSpacing: "0.1em" }}>{to}</span>
            </div>
          </div>

          {/* City names */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#ffffff", fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: "-1px" }}>
              {fromCity}
            </span>
            <span style={{ color: "#6366f1", fontSize: 36, fontWeight: 900 }}>→</span>
            <span style={{ color: "#ffffff", fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: "-1px" }}>
              {toCity}
            </span>
          </div>

          {/* Price badge + tagline */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
            {cheapestPrice !== null && (
              <div style={{
                display: "flex",
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 12,
                padding: "8px 20px",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ color: "#10b981", fontSize: 13, fontWeight: 700 }}>À partir de</span>
                <span style={{ color: "#10b981", fontSize: 28, fontWeight: 900 }}>
                  ${cheapestPrice}
                </span>
              </div>
            )}
            <span style={{ color: "#94a3b8", fontSize: 18, lineHeight: 1.4 }}>
              Cash ou miles ?{"\n"}KEZA calcule la meilleure option.
            </span>
          </div>
        </div>

        {ogBottomBar("Comparateur cash vs miles · 46 programmes · mis à jour quotidiennement")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
