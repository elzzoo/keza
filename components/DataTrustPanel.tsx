import { MILES_PRICES } from "@/data/milesPrices";
import { Badge, Card } from "@/components/ui";
import { formatLatestMilesReviewShort, getLatestMilesReviewDate } from "@/lib/milesReview";
import { isMilesReviewStale } from "@/lib/milesFreshness";

type DataTrustPanelProps = {
  lang?: "fr" | "en";
  compact?: boolean;
  className?: string;
};

const PROGRAM_COUNT = MILES_PRICES.length;
const HIGH_CONFIDENCE_COUNT = MILES_PRICES.filter((p) => p.confidence === "HIGH").length;

export function DataTrustPanel({ lang = "fr", compact = false, className }: DataTrustPanelProps) {
  const latestReview = formatLatestMilesReviewShort(lang);
  const latestReviewDate = getLatestMilesReviewDate();
  const valuationsStale = !latestReviewDate || isMilesReviewStale(latestReviewDate);
  const copy = lang === "fr"
    ? {
        title: "Qualité des données",
        subtitle: "Ce que Xalifly utilise pour décider cash ou miles.",
        liveTitle: "Prix cash live",
        liveBody: "Fares issus de Duffel et Aviasales, puis rafraîchis pendant la recherche.",
        valuesTitle: `${PROGRAM_COUNT} valeurs miles/points`,
        valuesBody: valuationsStale
          ? `Dernière date du référentiel : ${latestReview}. Estimations anciennes à revalider.`
          : `Dernière date du référentiel : ${latestReview}.`,
        confidenceTitle: "Confiance affichée",
        confidenceBody: `${HIGH_CONFIDENCE_COUNT} programmes en confiance élevée, avec taxes et estimations signalées.`,
        source: "Sources : Duffel, Aviasales, ThePointsGuy, NerdWallet, AwardWallet",
        reviewed: valuationsStale ? "Estimations anciennes" : "Référence miles",
      }
    : {
        title: "Data quality",
        subtitle: "What Xalifly uses to decide cash or miles.",
        liveTitle: "Live cash fares",
        liveBody: "Fares come from Duffel and Aviasales, then refresh during search.",
        valuesTitle: `${PROGRAM_COUNT} miles & points values`,
        valuesBody: valuationsStale
          ? `Latest reference date: ${latestReview}. Older estimates need review.`
          : `Latest reference date: ${latestReview}.`,
        confidenceTitle: "Visible confidence",
        confidenceBody: `${HIGH_CONFIDENCE_COUNT} programs are high confidence, with taxes and estimates called out.`,
        source: "Sources: Duffel, Aviasales, ThePointsGuy, NerdWallet, AwardWallet",
        reviewed: valuationsStale ? "Older estimates" : "Miles reference",
      };

  const items = [
    { title: copy.liveTitle, body: copy.liveBody, tone: "success" as const, badge: lang === "fr" ? "live" : "live" },
    { title: copy.valuesTitle, body: copy.valuesBody, tone: valuationsStale ? "warning" as const : "primary" as const, badge: copy.reviewed },
    { title: copy.confidenceTitle, body: copy.confidenceBody, tone: "warning" as const, badge: "HIGH / MED / LOW" },
  ];

  if (compact) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {items.map((item) => (
            <Card key={item.title} padding="sm" className="bg-surface/60">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-fg text-[11px]">{item.title}</div>
                <Badge tone={item.tone} className="hidden md:inline-flex">{item.badge}</Badge>
              </div>
              <div className="mt-1 text-[11px] text-muted leading-snug">{item.body}</div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className={className} padding="md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-fg">{copy.title}</h2>
          <p className="mt-1 text-xs text-muted">{copy.subtitle}</p>
        </div>
        <Badge tone={valuationsStale ? "warning" : "primary"}>{copy.reviewed} · {latestReview}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-xl border border-border bg-surface-2 p-3">
            <Badge tone={item.tone}>{item.badge}</Badge>
            <div className="mt-2 text-xs font-bold text-fg">{item.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{item.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 border-t border-border/60 pt-3 text-[11px] text-muted">
        {copy.source}
      </p>
    </Card>
  );
}
