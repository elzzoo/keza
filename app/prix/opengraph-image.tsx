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
        {ogTopBar("Meilleur moment pour voyager")}
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
            Prix mois par mois
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            20 destinations · quand partir pour payer moins
          </span>
        </div>
        {ogBottomBar("keza.app/prix")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
