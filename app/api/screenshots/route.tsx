import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// GET /api/screenshots?id=1  → mobile portrait  390×844
// GET /api/screenshots?id=2  → desktop wide    1280×800
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "1";
  const wide = id === "2";

  const W = wide ? 1280 : 390;
  const H = wide ? 800 : 844;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0f",
          fontFamily: "system-ui, sans-serif",
          padding: wide ? 48 : 24,
          gap: 0,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: wide ? 40 : 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: wide ? 48 : 36,
              height: wide ? 48 : 36,
              background: "linear-gradient(135deg, #1e3a5f, #0a0a1a)",
              borderRadius: 10,
            }}
          >
            <span style={{ fontSize: wide ? 22 : 16, fontWeight: 900, color: "#3b82f6", lineHeight: 1 }}>K</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: wide ? 22 : 16, fontWeight: 900, color: "#e2e8f0", lineHeight: 1 }}>
              <span style={{ color: "#3b82f6" }}>Xali</span>fly
            </span>
            <span style={{ fontSize: wide ? 11 : 9, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Cash ou Miles ?
            </span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: wide ? 36 : 24 }}>
          <span style={{ fontSize: wide ? 42 : 28, fontWeight: 900, color: "#e2e8f0", lineHeight: 1.1 }}>
            {wide ? "Vols cash ou miles ?" : "Cash ou Miles ?"}
          </span>
          <span style={{ fontSize: wide ? 18 : 14, color: "#94a3b8", lineHeight: 1.5 }}>
            Xalifly calcule le meilleur choix{wide ? " en temps reel" : ""}
          </span>
        </div>

        {/* Search card */}
        <div
          style={{
            display: "flex",
            flexDirection: wide ? "row" : "column",
            gap: 12,
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 20,
            padding: wide ? 24 : 20,
            marginBottom: wide ? 32 : 20,
          }}
        >
          {[
            { city: "Dakar", code: "DSS" },
            { city: "Paris", code: "CDG" },
          ].map((airport, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#1e293b",
                borderRadius: 12,
                padding: wide ? "14px 20px" : "12px 16px",
                flex: wide ? 1 : undefined,
              }}
            >
              <span style={{ fontSize: wide ? 18 : 14, fontWeight: 900, color: "#60a5fa" }}>{airport.code}</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: wide ? 20 : 16, fontWeight: 700, color: "#e2e8f0" }}>
                  {airport.code}
                </span>
                <span style={{ fontSize: wide ? 12 : 10, color: "#64748b" }}>
                  {airport.city}
                </span>
              </div>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#3b82f6",
              borderRadius: 12,
              padding: wide ? "14px 32px" : "12px",
              fontWeight: 700,
              fontSize: wide ? 16 : 14,
              color: "white",
            }}
          >
            {wide ? "Rechercher ->" : "->"}
          </div>
        </div>

        {/* Result chips */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Cash", value: "620 EUR", tag: "Le moins cher" },
            { label: "Miles", value: "30 000 pts", tag: "2x plus de valeur" },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: i === 1 ? "rgba(59,130,246,0.12)" : "#0f172a",
                border: `1px solid ${i === 1 ? "rgba(59,130,246,0.3)" : "#1e293b"}`,
                borderRadius: 14,
                padding: wide ? "16px 24px" : "12px 16px",
                flex: 1,
              }}
            >
              <span style={{ fontSize: wide ? 14 : 11, fontWeight: 900, color: i === 1 ? "#60a5fa" : "#94a3b8" }}>{r.label}</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: wide ? 20 : 15, fontWeight: 700, color: "#e2e8f0" }}>
                  {r.value}
                </span>
                <span style={{ fontSize: wide ? 12 : 10, color: i === 1 ? "#60a5fa" : "#64748b" }}>
                  {r.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
