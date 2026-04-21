import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "KEZA — Cash ou Miles ?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          background: "linear-gradient(135deg, #0B1120 0%, #131C31 50%, #0B1120 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Subtle grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59,130,246,0.05) 0%, transparent 50%)",
            display: "flex",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 80, fontWeight: 900, color: "#3B82F6" }}>KE</span>
          <span style={{ fontSize: 80, fontWeight: 900, color: "#F1F5F9" }}>ZA</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            background: "linear-gradient(to right, #93C5FD, #3B82F6, #60A5FA)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 16,
            display: "flex",
          }}
        >
          Cash ou Miles ?
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 22,
            color: "#64748B",
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.5,
            display: "flex",
          }}
        >
          Comparez le vrai prix de chaque vol en 1 clic
        </div>

        {/* Bottom badges */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
          }}
        >
          {["7 900+ aeroports", "46 programmes miles", "100% gratuit"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 20px",
                  borderRadius: 12,
                  background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                <span style={{ fontSize: 16, color: "#60A5FA", fontWeight: 600 }}>
                  {label}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
