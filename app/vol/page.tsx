import type { Metadata } from "next";
import Link from "next/link";
import { ROUTE_META } from "@/data/routeMeta";
import { AIRPORTS } from "@/data/airports";
import { iataToSlug } from "@/lib/routeSlug";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Toutes nos routes — Vols Cash vs Miles | Xalifly",
  description:
    "Comparez le prix cash vs miles sur plus de 50 routes internationales. " +
    "Afrique, Europe, USA, Asie — Xalifly calcule quelle option est la moins chère.",
  alternates: { canonical: `${SITE_URL}/vol` },
  openGraph: {
    title: "Vols Cash vs Miles — Toutes les routes | Xalifly",
    description: "50+ routes internationales comparées cash vs miles en temps réel.",
    url: `${SITE_URL}/vol`,
    siteName: "Xalifly",
    images: [{ url: `${SITE_URL}/api/og`, width: 1200, height: 630 }],
  },
};

function getAirport(code: string) {
  return AIRPORTS.find(a => a.code === code);
}

// Group routes by continent/region based on from-airport
function regionOf(code: string): string {
  const apt = AIRPORTS.find(a => a.code === code);
  if (!apt) return "Autre";
  const c = apt.countryEn;
  if (["France", "United Kingdom", "Germany", "Spain", "Italy", "Netherlands", "Turkey"].includes(c)) return "Europe";
  if (["Senegal", "Ivory Coast", "Nigeria", "Kenya", "Ethiopia", "Morocco", "Ghana", "Cameroon"].includes(c)) return "Afrique";
  if (["United States", "Canada", "Mexico"].includes(c)) return "Amériques";
  if (["Japan", "South Korea", "Singapore", "Hong Kong", "Malaysia", "Thailand"].includes(c)) return "Asie";
  if (["United Arab Emirates", "Qatar", "Saudi Arabia"].includes(c)) return "Moyen-Orient";
  return "Autre";
}

export default function VolIndexPage() {
  const routes = Array.from(ROUTE_META.entries()).map(([key, meta]) => {
    const [from, to] = key.split("-");
    const fromApt = getAirport(from!);
    const toApt   = getAirport(to!);
    return {
      key,
      from: from!,
      to:   to!,
      slug: iataToSlug(from!, to!),
      fromCity: fromApt?.city ?? from,
      toCity:   toApt?.city   ?? to,
      fromFlag: fromApt?.flag ?? "",
      toFlag:   toApt?.flag   ?? "",
      region:   regionOf(from!),
      isNonstop: meta.isNonstop,
      bestProgram: meta.bestPrograms[0] ?? "",
    };
  });

  // Group by region
  const regions = ["Afrique", "Europe", "Amériques", "Asie", "Moyen-Orient", "Autre"];
  const grouped = Object.fromEntries(
    regions.map(r => [r, routes.filter(rt => rt.region === r)])
  );

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-black text-lg">
            <span className="text-primary">Xali</span><span className="text-fg">fly</span>
          </Link>
          <Link href="/" className="text-xs font-semibold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors">
            Chercher un vol →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div>
          <h1 className="text-3xl font-black text-fg mb-2">
            Toutes nos routes <span className="text-primary">Cash vs Miles</span>
          </h1>
          <p className="text-muted text-sm leading-relaxed max-w-2xl">
            Sélectionnez une route pour voir les prix en temps réel, les meilleurs programmes miles,
            et si vos points valent plus que le prix cash.
          </p>
        </div>

        {regions.map(region => {
          const items = grouped[region];
          if (!items || items.length === 0) return null;
          return (
            <section key={region}>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-muted mb-3">{region}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map(rt => (
                  <Link
                    key={rt.key}
                    href={`/vol/${rt.slug}`}
                    className="group flex items-center gap-3 px-4 py-3 bg-surface rounded-xl border border-border hover:border-primary/30 hover:bg-surface-2 transition-all duration-150"
                  >
                    <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
                      <span>{rt.fromFlag}</span>
                      <span className="font-semibold text-fg truncate">{rt.fromCity}</span>
                      <span className="text-primary">→</span>
                      <span>{rt.toFlag}</span>
                      <span className="font-semibold text-fg truncate">{rt.toCity}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {rt.isNonstop && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-semibold">Direct</span>
                      )}
                      <span className="text-[10px] text-muted group-hover:text-primary transition-colors">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="border-t border-border mt-12 py-8 text-center text-xs text-muted">
        <Link href="/" className="hover:text-fg transition-colors">Xalifly</Link>
        {" · "}Comparer cash vs miles sur chaque vol
      </footer>
    </div>
  );
}
