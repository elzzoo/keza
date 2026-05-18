import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeStr } = await params;
  const size = parseInt(sizeStr) || 192;
  const clamped = size >= 512 ? 512 : 192;

  // Maskable icons must NOT have rounded corners — the OS applies its own
  // shape mask. Content must stay inside the "safe zone" (center 80% circle).
  const maskable = req.nextUrl.searchParams.get("maskable") === "1";

  const fontSize = clamped >= 512 ? 156 : maskable ? 52 : 58;
  const subFontSize = clamped >= 512 ? 120 : maskable ? 40 : 44;
  const radius = maskable ? 0 : clamped >= 512 ? 110 : 38;

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
