import { StatCard } from "./StatCard";

export function AffiliateRevenueSection({
  clicksToday,
  clicksTotal,
  estimatedBookings,
  estimatedRevenue,
}: {
  clicksToday: number;
  clicksTotal: number;
  estimatedBookings: number;
  estimatedRevenue: number;
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
        Clicks Affiliés &amp; Revenu
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Clicks aujourd'hui"
          value={clicksToday}
          sub="bouton Réserver"
          color="blue"
        />
        <StatCard
          label="Clicks total"
          value={clicksTotal}
          sub="depuis le lancement"
          color="purple"
        />
        <StatCard
          label="Réservations estimées"
          value={estimatedBookings}
          sub="3% conversion × clicks"
          color="amber"
        />
        <StatCard
          label="Revenu estimé"
          value={`$${estimatedRevenue}`}
          sub="à $18 de commission moy."
          color="green"
        />
      </div>
    </div>
  );
}
