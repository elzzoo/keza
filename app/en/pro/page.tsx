import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkProAccess } from "@/lib/proAccess";
import { ProClient } from "@/app/pro/ProClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Xalifly Pro — Unlimited flight alerts",
  description:
    "Upgrade to Xalifly Pro for unlimited price alerts, multi-device push notifications, and 6-month price history.",
  alternates: {
    canonical: `${SITE_URL}/en/pro`,
    languages: { fr: `${SITE_URL}/pro`, en: `${SITE_URL}/en/pro` },
  },
  openGraph: {
    title: "Xalifly Pro — Unlimited flight alerts",
    description: "Unlimited alerts · multi-device push · 6-month price history",
    url: `${SITE_URL}/en/pro`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Xalifly Pro — Unlimited flight alerts",
    description: "Unlimited alerts · multi-device push · 6-month price history",
  },
  robots: "index, follow",
};

export default async function EnProPage({
  searchParams,
}: {
  searchParams?: Promise<{ upgraded?: string; email?: string }>;
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
      initialEmail={sp?.email ?? undefined}
      lang="en"
    />
  );
}
