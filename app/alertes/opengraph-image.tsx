import { ImageResponse } from "next/og";
import { ogWrapper, ogTopBar, ogBottomBar, OG_WIDTH, OG_HEIGHT } from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Alertes prix")}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#ffffff", fontSize: 64, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 16 }}>
            Suis les prix,{" "}
            <span style={{ color: "#10b981" }}>ne rate rien</span>
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            Reçois une alerte dès que le prix chute sous ton seuil
          </span>
        </div>
        {ogBottomBar("Alertes gratuites · mise à jour quotidienne")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
