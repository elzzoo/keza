import { ImageResponse } from "next/og";
import { ogWrapper, ogTopBar, ogBottomBar, OG_WIDTH, OG_HEIGHT } from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Calculateur de miles")}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#ffffff", fontSize: 64, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 16 }}>
            Tes miles valent{" "}
            <span style={{ color: "#f59e0b" }}>combien ?</span>
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            Calcule la valeur réelle de tes miles Flying Blue, Avios et autres programmes
          </span>
        </div>
        {ogBottomBar("20+ programmes · valeur en temps réel")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
