import { StatCard } from "./StatCard";

export function EmailEngagementSection({
  confirmationOpens,
  priceDropOpens,
  digestOpens,
}: {
  confirmationOpens: number;
  priceDropOpens: number;
  digestOpens: number;
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
        Email Engagement — 7 derniers jours
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Confirmations ouvertes"
          value={confirmationOpens}
          sub="emails de création d'alerte"
          color="blue"
        />
        <StatCard
          label="Alertes prix ouvertes"
          value={priceDropOpens}
          sub="notifications de baisse"
          color="green"
        />
        <StatCard
          label="Digests ouverts"
          value={digestOpens}
          sub="récaps hebdos"
          color="purple"
        />
      </div>
    </div>
  );
}
