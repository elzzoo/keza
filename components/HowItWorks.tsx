interface Props { lang: "fr" | "en" }

const STEPS = {
  fr: [
    { n: "1", icon: "🗺", title: "Entrez votre trajet", desc: "Départ, destination, dates, classe et passagers." },
    { n: "2", icon: "⚡", title: "On compare en temps réel", desc: "Prix cash vs valeur de vos miles — calcul instantané." },
    { n: "3", icon: "✅", title: "KEZA décide pour vous", desc: "USE MILES, CONSIDER ou USE CASH — clair, sans ambiguïté." },
  ],
  en: [
    { n: "1", icon: "🗺", title: "Enter your route", desc: "Origin, destination, dates, cabin and passengers." },
    { n: "2", icon: "⚡", title: "We compare in real time", desc: "Cash price vs miles value — instant calculation." },
    { n: "3", icon: "✅", title: "KEZA decides for you", desc: "USE MILES, CONSIDER or USE CASH — clear, unambiguous." },
  ],
};

export function HowItWorks({ lang }: Props) {
  const steps = STEPS[lang];
  return (
    <section id="how" className="bg-surface rounded-2xl border border-border p-6">
      <p className="section-rule mb-5">
        {lang === "fr" ? "Comment ça fonctionne" : "How it works"}
      </p>
      <div className="grid grid-cols-3 gap-4 relative">
        {/* Arrow connectors */}
        <div className="absolute top-4 left-1/3 w-1/3 flex items-center justify-center pointer-events-none">
          <div className="text-subtle text-sm">→</div>
        </div>
        <div className="absolute top-4 left-2/3 w-1/3 flex items-center justify-center pointer-events-none">
          <div className="text-subtle text-sm">→</div>
        </div>

        {steps.map((s) => (
          <div key={s.n} className="text-center space-y-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-black text-sm mx-auto">
              {s.n}
            </div>
            <p className="text-sm font-semibold text-fg leading-snug">{s.title}</p>
            <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
