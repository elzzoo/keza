interface Props { lang: "fr" | "en" }

const STEPS = {
  fr: [
    { n: "1", title: "Entrez votre trajet",      desc: "Départ, destination, dates, classe et nombre de passagers." },
    { n: "2", title: "On compare en temps réel", desc: "Prix cash réel vs valeur de vos miles — calcul immédiat." },
    { n: "3", title: "KEZA décide pour vous",    desc: "USE MILES, CONSIDER ou USE CASH — clair et sans ambiguïté." },
  ],
  en: [
    { n: "1", title: "Enter your route",         desc: "Origin, destination, dates, cabin class and passengers." },
    { n: "2", title: "We compare in real time",  desc: "Actual cash price vs your miles value — instant calculation." },
    { n: "3", title: "KEZA decides for you",     desc: "USE MILES, CONSIDER or USE CASH — clear and unambiguous." },
  ],
};

export function HowItWorks({ lang }: Props) {
  const steps = STEPS[lang];
  return (
    <section className="glass rounded-2xl px-6 py-5 space-y-4">
      <p className="section-rule">
        {lang === "fr" ? "Comment ça fonctionne" : "How it works"}
      </p>
      <div className="grid grid-cols-3 gap-4">
        {steps.map((s) => (
          <div key={s.n} className="text-center space-y-2">
            <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center text-accent font-black text-sm mx-auto">
              {s.n}
            </div>
            <p className="text-white text-xs font-bold leading-snug">{s.title}</p>
            <p className="text-muted text-[11px] leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
