import type { Metadata } from "next";
import { ProfilClient } from "./ProfilClient";

export const metadata: Metadata = {
  title: "Mon profil – Xalifly",
  description: "Gérez vos miles, vos programmes fidélité et vos routes favorites.",
  robots: { index: false },
};

export default function ProfilPage() {
  return <ProfilClient />;
}
