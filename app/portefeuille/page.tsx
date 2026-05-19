import type { Metadata } from "next";
import { PortefeuilleClient } from "./PortefeuilleClient";

export const metadata: Metadata = {
  title: "Mon Portefeuille de Miles | KEZA",
  description: "Gérez vos soldes miles et découvrez vos possibilités de voyage",
};

export default function PortefeuillePage() {
  return <PortefeuilleClient />;
}
