interface Props { lang: "fr" | "en" }

type StepIconName = "route" | "compare" | "decision";

function StepIcon({ name }: { name: StepIconName }) {
  const common = {
    className: "h-4 w-4",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "route") {
    return (
      <svg {...common}>
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="6" r="3" />
        <path d="M8.6 16.4 15.4 7.6" />
      </svg>
    );
  }
  if (name === "compare") {
    return (
      <svg {...common}>
        <path d="M7 7h11" />
        <path d="m15 4 3 3-3 3" />
        <path d="M17 17H6" />
        <path d="m9 14-3 3 3 3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20 6 9 17l-5-5" />
      <path d="M14 6h6v6" />
    </svg>
  );
}

const STEPS = {
  fr: [
    { n: "1", icon: "route" as const, title: "Renseignez le vol", desc: "Départ, destination, dates, cabine et passagers." },
    { n: "2", icon: "compare" as const, title: "Comparez le vrai coût", desc: "Cash, taxes, miles requis et valeur réelle du point sont calculés ensemble." },
    { n: "3", icon: "decision" as const, title: "Décidez en confiance", desc: "Xalifly indique l'option la plus rationnelle et signale les prix estimés." },
  ],
  en: [
    { n: "1", icon: "route" as const, title: "Enter the trip", desc: "Origin, destination, dates, cabin, and passengers." },
    { n: "2", icon: "compare" as const, title: "Compare real cost", desc: "Cash fare, taxes, required miles, and point value are calculated together." },
    { n: "3", icon: "decision" as const, title: "Decide with confidence", desc: "Xalifly recommends the rational option and flags estimated prices." },
  ],
};

export function HowItWorks({ lang }: Props) {
  const steps = STEPS[lang];
  return (
    <section id="how" className="bg-surface rounded-2xl border border-border p-6">
      <h2 className="section-rule mb-5">
        {lang === "fr" ? "Comment ça fonctionne" : "How it works"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-3 sm:relative">
        {/* Arrow connectors */}
        <div className="absolute top-4 left-1/3 hidden w-1/3 items-center justify-center pointer-events-none sm:flex">
          <div className="text-subtle text-sm">→</div>
        </div>
        <div className="absolute top-4 left-2/3 hidden w-1/3 items-center justify-center pointer-events-none sm:flex">
          <div className="text-subtle text-sm">→</div>
        </div>

        {steps.map((s) => (
          <div key={s.n} className="text-left sm:text-center space-y-2.5 rounded-xl border border-border/70 bg-surface-2/40 p-4 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex items-center gap-2 sm:block">
              <div className="w-9 h-9 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center sm:mx-auto">
                {s.n}
              </div>
              <div className="w-9 h-9 rounded-full border border-primary/25 bg-primary/10 text-primary flex items-center justify-center sm:mx-auto sm:mt-2">
                <StepIcon name={s.icon} />
              </div>
            </div>
            <p className="text-sm font-semibold text-fg leading-snug">{s.title}</p>
            <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
