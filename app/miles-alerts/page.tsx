import type { Metadata } from "next";
import { MilesAlertsClient } from "./MilesAlertsClient";

export const metadata: Metadata = {
  title: "Miles Alerts — KEZA",
  description: "Manage your miles price alerts",
};

export default function MilesAlertsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Miles Alerts</h1>
      <p className="text-gray-600 mb-8">
        Set alerts for great miles deals. We&apos;ll notify you by email when your target price is reached.
      </p>
      <MilesAlertsClient />
    </div>
  );
}
