import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Deals cash vs miles | KEZA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a1a 0%, #1e3a5f 100%)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 52, fontWeight: 900, marginBottom: 24 }}>
          <span style={{ color: "#3b82f6" }}>KE</span>
          <span style={{ color: "#e2e8f0" }}>ZA</span>
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: "#e2e8f0",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 800,
            marginBottom: 16,
          }}
        >
          Deals cash vs miles du moment
        </div>
        <div style={{ fontSize: 22, color: "#94a3b8", textAlign: "center", maxWidth: 600 }}>
          Payez au meilleur prix — cash ou miles — sur chaque vol
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 99,
            padding: "10px 24px",
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ color: "#94a3b8", fontSize: 18, fontWeight: 600 }}>
            Mis à jour en temps réel
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
