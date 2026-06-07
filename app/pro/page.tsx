import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkProAccess } from "@/lib/proAccess";
import { ProClient } from "./ProClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "KEZA Pro — Alertes illimitées",
  description: "Passez à KEZA Pro : alertes de prix illimitées, notifications push multi-devices, historique 6 mois. Démarrez votre essai gratuit de 7 jours.",
  openGraph: {
    title: "KEZA Pro — Alertes illimitées",
    description: "Alertes illimitées · push multi-devices · historique 6 mois",
    url: `${SITE_URL}/pro`,
  },
  twitter: {
    card: "summary_large_image",
    title: "KEZA Pro — Alertes illimitées",
    description: "Alertes illimitées · push multi-devices · historique 6 mois",
  },
  robots: "index, follow",
};

export default async function ProPage({
  searchParams,
}: {
  searchParams?: Promise<{ upgraded?: string }>;
}) {
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  let proStatus = null;

  if (session?.user?.email) {
    proStatus = await checkProAccess(session.user.email);
  }

  return (
    <ProClient
      upgraded={sp?.upgraded === "1"}
      isLoggedIn={!!session?.user?.email}
      proStatus={proStatus}
      userEmail={session?.user?.email ?? undefined}
    />
  );
}
