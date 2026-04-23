import { ImageResponse } from "next/og";
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

export default async function Image() {
  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Comparateur de destinations")}
        <div
          style={{ display: "flex", flexDirection: "column", position: "relative" }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              marginBottom: 16,
            }}
          >
            Comparez 3 destinations
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            Miles, cash et meilleure période côte-à-côte
          </span>
        </div>
        {ogBottomBar("keza.app/comparer")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
