import type { Metadata } from "next";
import { MILES_PRICES } from "@/data/milesPrices";
import { CalculateurClient } from "./CalculateurClient";

export const metadata: Metadata = {
  title: "Calculateur de valeur miles — KEZA",
  description: "Combien valent vos miles Flying Blue, Aeroplan, LifeMiles en euros ? Calculateur instantané par programme de fidélité.",
};

export default function CalculateurPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <a href="/" className="text-xs text-muted hover:text-fg transition-colors">← Retour</a>
          <h1 className="text-3xl font-black mt-4 mb-2">
            <span className="text-primary">Calculateur</span> de valeur miles
          </h1>
          <p className="text-muted text-sm">
            Découvrez combien valent vos miles selon le programme et le type de rédemption.
          </p>
        </div>

        <CalculateurClient programs={MILES_PRICES} />

        <div className="mt-10 bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold text-fg">
              Valeur de référence par programme
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Valeurs de marché — sources : ThePointsGuy, NerdWallet, AwardWallet
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Programme</th>
                <th className="text-right px-5 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Valeur / mile</th>
                <th className="text-right px-5 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Confiance</th>
              </tr>
            </thead>
            <tbody>
              {MILES_PRICES.map((p) => (
                <tr key={p.program} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3 font-medium text-fg">{p.program}</td>
                  <td className="px-5 py-3 text-right font-bold text-primary">{p.valueCents.toFixed(1)}¢</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.confidence === "HIGH"   ? "bg-success/10 text-success" :
                      p.confidence === "MEDIUM" ? "bg-warning/10 text-warning" :
                                                  "bg-surface-2 text-muted"
                    }`}>
                      {p.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
