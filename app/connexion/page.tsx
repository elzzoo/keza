import type { Metadata } from "next";
import { ConnexionClient } from "./ConnexionClient";

export const metadata: Metadata = {
  title: "Connexion — Xalifly",
  robots: { index: false },
};

export default function ConnexionPage() {
  return <ConnexionClient />;
}
