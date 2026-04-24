// app/apple-icon.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #0a0a1a 100%)",
          borderRadius: 38,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          <span
            style={{
              fontFamily: "system-ui, sans-serif",
              fontWeight: 900,
              fontSize: 52,
              color: "#3b82f6",
              lineHeight: 1,
            }}
          >
            KE
          </span>
          <span
            style={{
              fontFamily: "system-ui, sans-serif",
              fontWeight: 900,
              fontSize: 40,
              color: "#e2e8f0",
              lineHeight: 1,
            }}
          >
            ZA
          </span>
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
