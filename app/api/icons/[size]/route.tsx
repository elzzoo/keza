import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: { size: string } }
) {
  const size = parseInt(params.size) || 192;
  const clamped = size >= 512 ? 512 : 192;
  const fontSize = clamped >= 512 ? 156 : 58;
  const subFontSize = clamped >= 512 ? 120 : 44;
  const radius = clamped >= 512 ? 110 : 38;

  return new ImageResponse(
    (
      <div
        style={{
          width: clamped,
          height: clamped,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #0a0a1a 100%)",
          borderRadius: radius,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "system-ui, sans-serif",
              fontWeight: 900,
              fontSize: fontSize,
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
              fontSize: subFontSize,
              color: "#e2e8f0",
              lineHeight: 1,
            }}
          >
            ZA
          </span>
        </div>
      </div>
    ),
    { width: clamped, height: clamped }
  );
}
