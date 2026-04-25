import type { Metadata } from "next";
import { ProClient } from "./ProClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "KEZA Pro — Alertes illimitées",
  description: "Passez à KEZA Pro : alertes de prix illimitées, notifications push multi-devices, historique 6 mois. Rejoignez la liste d'attente.",
  openGraph: {
    title: "KEZA Pro — Alertes illimitées",
    description: "Alertes illimitées · push multi-devices · historique 6 mois",
    url: `${SITE_URL}/pro`,
  },
  robots: "index, follow",
};

export default function ProPage() {
  return <ProClient />;
}
