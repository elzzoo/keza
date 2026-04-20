interface Props { lang: "fr" | "en" }

const ITEMS = {
  fr: [
    { icon: "✈", value: "7 900+", label: "aéroports" },
    { icon: "🏆", value: "46",   label: "programmes miles" },
    { icon: "🌍", value: "120+", label: "compagnies" },
    { icon: "🆓", value: "100%", label: "gratuit" },
  ],
  en: [
    { icon: "✈", value: "7,900+", label: "airports" },
    { icon: "🏆", value: "46",   label: "miles programs" },
    { icon: "🌍", value: "120+", label: "airlines" },
    { icon: "🆓", value: "100%", label: "free" },
  ],
};

export function TrustBar({ lang }: Props) {
  const items = ITEMS[lang];
  return (
    <div className="bg-surface border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-center gap-0">
        {items.map((item, i) => (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-2 px-5 py-1">
              <span className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-sm flex-shrink-0">
                {item.icon}
              </span>
              <span className="text-sm text-muted">
                <span className="font-bold text-fg">{item.value} </span>
                {item.label}
              </span>
            </div>
            {i < items.length - 1 && (
              <span className="w-px h-4 bg-border flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
