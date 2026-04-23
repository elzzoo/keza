// app/opengraph-image.tsx
// og:image pour la home page (keza.app).
// Convention Next.js 14 : ce fichier auto-wire l'og:image du segment racine.

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
        {ogTopBar("Comparateur de vols")}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              marginBottom: 16,
            }}
          >
            Cash ou Miles ?
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            Compare le vrai coût de chaque vol depuis Dakar
          </span>
        </div>
        {ogBottomBar("20 destinations · mise à jour mensuelle")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
