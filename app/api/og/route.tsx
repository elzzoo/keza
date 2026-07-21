import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { AIRPORTS } from "@/data/airports";

export const runtime = "edge";

// Cache for 24h — OG images rarely change per route
export const revalidate = 86400;

function getAirport(code: string) {
  return AIRPORTS.find(a => a.code === code);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const from     = (searchParams.get("from") ?? "").toUpperCase();
  const to       = (searchParams.get("to")   ?? "").toUpperCase();
  const savings  = searchParams.get("savings")  ?? "";   // e.g. "$450"
  const price    = searchParams.get("price")    ?? "";   // e.g. "$1 200"
  const program  = searchParams.get("program")  ?? "";   // e.g. "Flying Blue"
  const lang     = searchParams.get("lang")     ?? "fr";
  const cabin    = searchParams.get("cabin")    ?? "economy";

  const fromApt  = getAirport(from);
  const toApt    = getAirport(to);
  const fromCity = fromApt ? (lang === "fr" ? fromApt.city : fromApt.cityEn) : from;
  const toCity   = toApt   ? (lang === "fr" ? toApt.city   : toApt.cityEn)   : to;
  const fromFlag = fromApt?.flag ?? "";
  const toFlag   = toApt?.flag   ?? "";

  const isRoute  = from.length === 3 && to.length === 3;

  const cabinLabel: Record<string, string> = {
    economy:  lang === "fr" ? "Éco"      : "Economy",
    premium:  lang === "fr" ? "Premium"  : "Premium Eco",
    business: lang === "fr" ? "Business" : "Business",
    first:    lang === "fr" ? "Première" : "First",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #060D1F 0%, #0D1A35 60%, #0A1628 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "52px 64px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div style={{
          position: "absolute",
          top: "-120px",
          right: "-80px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
        }} />

        {/* Top row: Xalifly logo + cabin badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#3B82F6", letterSpacing: "-1px" }}>
              Xali<span style={{ color: "#F1F5F9" }}>fly</span>
            </div>
            <div style={{
              fontSize: "12px",
              color: "#64748B",
              fontWeight: 600,
              borderLeft: "1px solid #1E293B",
              paddingLeft: "12px",
              marginLeft: "4px",
            }}>
              Cash ou Miles ?
            </div>
          </div>
          {cabin !== "economy" && (
            <div style={{
              padding: "6px 16px",
              borderRadius: "20px",
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#60A5FA",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}>
              {cabinLabel[cabin]}
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px" }}>
          {isRoute ? (
            <>
              {/* Flags + codes */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "56px", lineHeight: 1 }}>{fromFlag}</div>
                  <div style={{ fontSize: "20px", color: "#94A3B8", fontWeight: 600, marginTop: "4px" }}>{from}</div>
                </div>
                {/* Arrow */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    height: "2px",
                    background: "linear-gradient(90deg, rgba(59,130,246,0.4), rgba(59,130,246,0.9), rgba(59,130,246,0.4))",
                    width: "100%",
                    borderRadius: "2px",
                  }} />
                  <div style={{ color: "#3B82F6", fontSize: "24px" }}>✈</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ fontSize: "56px", lineHeight: 1 }}>{toFlag}</div>
                  <div style={{ fontSize: "20px", color: "#94A3B8", fontWeight: 600, marginTop: "4px" }}>{to}</div>
                </div>
              </div>

              {/* City names */}
              <div style={{
                fontSize: "52px",
                fontWeight: 900,
                color: "#F1F5F9",
                letterSpacing: "-2px",
                lineHeight: 1.1,
              }}>
                {fromCity}
                <span style={{ color: "#3B82F6", margin: "0 16px" }}>→</span>
                {toCity}
              </div>

              {/* Savings or best price row */}
              <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                {savings && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 24px",
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    borderRadius: "12px",
                  }}>
                    <div style={{ color: "#10B981", fontSize: "28px", fontWeight: 900 }}>
                      +{savings}
                    </div>
                    <div style={{ color: "#6EE7B7", fontSize: "18px", fontWeight: 600 }}>
                      {lang === "fr" ? "économisés" : "saved"}
                    </div>
                  </div>
                )}
                {price && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 24px",
                    background: "rgba(245,158,11,0.12)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: "12px",
                  }}>
                    <div style={{ color: "#94A3B8", fontSize: "16px" }}>
                      {lang === "fr" ? "dès" : "from"}
                    </div>
                    <div style={{ color: "#FCD34D", fontSize: "28px", fontWeight: 900 }}>
                      {price}
                    </div>
                  </div>
                )}
                {program && (
                  <div style={{ color: "#64748B", fontSize: "18px", fontWeight: 500 }}>
                    {lang === "fr" ? "avec" : "with"} {program}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Generic / homepage OG */
            <div style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "#F1F5F9",
              letterSpacing: "-3px",
              lineHeight: 1.1,
            }}>
              Cash ou Miles ?<br />
              <span style={{ color: "#3B82F6" }}>Xalifly décide.</span>
            </div>
          )}
        </div>

        {/* Bottom strip */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "20px",
        }}>
          <div style={{ color: "#334155", fontSize: "16px", fontWeight: 600 }}>keza.app</div>
          <div style={{
            padding: "10px 22px",
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: "8px",
            color: "#60A5FA",
            fontSize: "16px",
            fontWeight: 600,
          }}>
            {lang === "fr"
              ? "Comparer maintenant →"
              : "Compare now →"}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
