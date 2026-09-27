import type { Metadata } from "next";
import { ConnexionClient } from "@/app/connexion/ConnexionClient";

export const metadata: Metadata = {
  title: "Sign in — Xalifly",
  robots: { index: false },
};

export default async function EnConnexionPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  return <ConnexionClient callbackUrl={sp?.callbackUrl} lang="en" />;
}
