import { ImageResponse } from "next/og";
import { ogWrapper, ogTopBar, ogBottomBar, OG_WIDTH, OG_HEIGHT } from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Programmes de fidélité")}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#ffffff", fontSize: 64, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 16 }}>
            Quel programme{" "}
            <span style={{ color: "#8b5cf6" }}>choisir ?</span>
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            Comparez Flying Blue, Avios, Miles & More et tous les grands programmes
          </span>
        </div>
        {ogBottomBar("20+ programmes · guide complet")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
