interface Props { lang: "fr" | "en" }

const ITEMS = {
  fr: [
    { icon: "✈", value: "20k+", label: "comparaisons" },
    { icon: "🏆", value: "19",   label: "programmes miles" },
    { icon: "🆓", value: "100%", label: "gratuit" },
  ],
  en: [
    { icon: "✈", value: "20k+", label: "comparisons" },
    { icon: "🏆", value: "19",   label: "miles programs" },
    { icon: "🆓", value: "100%", label: "free" },
  ],
};

export function TrustBar({ lang }: Props) {
  const items = ITEMS[lang];
  return (
    <div className="bg-white border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-center gap-0">
        {items.map((item, i) => (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-2 px-5 py-1">
              <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm flex-shrink-0">
                {item.icon}
              </span>
              <span className="text-sm text-muted">
                <span className="font-bold text-fg">{item.value} </span>
                {item.label}
              </span>
            </div>
            {i < items.length - 1 && (
              <span className="w-px h-4 bg-slate-200 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
