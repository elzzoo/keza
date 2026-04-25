import { ImageResponse } from "next/og";
import { ogWrapper, ogTopBar, ogBottomBar, OG_WIDTH, OG_HEIGHT } from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("KEZA pour les entreprises")}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#ffffff", fontSize: 64, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 16 }}>
            Optimise les{" "}
            <span style={{ color: "#3b82f6" }}>voyages d&apos;affaires</span>
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            Comparez cash vs miles pour toute votre équipe &mdash; économisez sur chaque vol
          </span>
        </div>
        {ogBottomBar("Solution B2B · intégration sur mesure")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
