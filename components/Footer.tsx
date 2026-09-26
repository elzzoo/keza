interface Props { lang: "fr" | "en" }

const LINKS = {
  fr: {
    legal: "/mentions-legales",
    privacy: "/confidentialite",
    business: "/entreprises",
    product:  { title: "Produit",           items: [{ label: "Rechercher", href: "/" }, { label: "Deals", href: "/deals" }, { label: "Calculateur", href: "/calculateur" }, { label: "Alertes prix", href: "/alertes" }, { label: "Alertes miles", href: "/miles-alerts" }, { label: "Mon compte", href: "/compte" }] },
    programs: { title: "Programmes miles",  items: [{ label: "Flying Blue (Air France)", href: "https://www.flyingblue.com" }, { label: "Miles&Smiles (Turkish)", href: "https://www.turkishairlines.com/fr-fr/miles-smiles/" }, { label: "LifeMiles (Avianca)", href: "https://www.lifemiles.com" }, { label: "Aeroplan (Air Canada)", href: "https://www.aircanada.com/aeroplan" }] },
    routes:   { title: "Routes populaires", items: [{ label: "Dakar → Paris", href: "/flights/DSS-CDG" }, { label: "New York → Londres", href: "/flights/JFK-LHR" }, { label: "Paris → Tokyo", href: "/flights/CDG-NRT" }, { label: "Lagos → Londres", href: "/flights/LOS-LHR" }] },
  },
  en: {
    legal: "/en/legal",
    privacy: "/en/privacy",
    business: "/en/entreprises",
    product:  { title: "Product",       items: [{ label: "Search", href: "/en" }, { label: "Deals", href: "/en/deals" }, { label: "Calculator", href: "/en/calculateur" }, { label: "Price alerts", href: "/en/alertes" }, { label: "Miles alerts", href: "/en/miles-alerts" }, { label: "My account", href: "/en/profile" }] },
    programs: { title: "Miles programs", items: [{ label: "Flying Blue (Air France)", href: "https://www.flyingblue.com" }, { label: "Miles&Smiles (Turkish)", href: "https://www.turkishairlines.com/en-int/miles-smiles/" }, { label: "LifeMiles (Avianca)", href: "https://www.lifemiles.com" }, { label: "Aeroplan (Air Canada)", href: "https://www.aircanada.com/aeroplan" }] },
    routes:   { title: "Popular routes", items: [{ label: "Dakar → Paris", href: "/en/flights/DSS-CDG" }, { label: "New York → London", href: "/en/flights/JFK-LHR" }, { label: "Paris → Tokyo", href: "/en/flights/CDG-NRT" }, { label: "Lagos → London", href: "/en/flights/LOS-LHR" }] },
  },
};

export function Footer({ lang }: Props) {
  const l = LINKS[lang];
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface border-t border-border mt-16">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-black text-xl mb-2">
              <span className="text-primary">Xali</span>
              <span className="text-fg">fly</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              {lang === "fr"
                ? "Comparez cash vs miles sur chaque vol, partout dans le monde."
                : "Compare cash vs miles on any flight, anywhere in the world."}
            </p>
            <p className="text-xs text-subtle mt-3">
              {lang === "fr" ? "Conçu à Dakar 🇸🇳" : "Built in Dakar 🇸🇳"}
            </p>
          </div>

          {/* Links */}
          {[l.product, l.programs, l.routes].map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-sm text-subtle hover:text-fg transition-colors duration-150">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-subtle">
          <span>© {year} Xalifly. {lang === "fr" ? "Tous droits réservés." : "All rights reserved."}</span>
          <div className="flex items-center gap-4">
            <a href={l.legal} className="hover:text-muted transition-colors">{lang === "fr" ? "Mentions légales" : "Legal"}</a>
            <a href={l.privacy} className="hover:text-muted transition-colors">{lang === "fr" ? "Confidentialité" : "Privacy"}</a>
            <a href={l.business} className="hover:text-muted transition-colors font-semibold text-primary/70 hover:text-primary">{lang === "fr" ? "Pour les entreprises" : "For Business"}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
