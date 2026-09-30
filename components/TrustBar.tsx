import { Badge } from "@/components/ui";

interface Props { lang: "fr" | "en" }

const ITEMS = {
  fr: [
    { icon: "✈", value: "7 900+", label: "aéroports" },
    { icon: "🏆", value: "33",   label: "programmes miles" },
    { icon: "🌍", value: "120+", label: "compagnies" },
    { icon: "🆓", value: "100%", label: "gratuit" },
  ],
  en: [
    { icon: "✈", value: "7,900+", label: "airports" },
    { icon: "🏆", value: "33",   label: "miles programs" },
    { icon: "🌍", value: "120+", label: "airlines" },
    { icon: "🆓", value: "100%", label: "free" },
  ],
};

export function TrustBar({ lang }: Props) {
  const items = ITEMS[lang];
  return (
    <div className="bg-surface border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto scrollbar-none">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center flex-shrink-0">
            <Badge tone="neutral" className="gap-2 rounded-full px-3 py-1.5 text-xs">
              <span className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-sm flex-shrink-0" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-muted">
                <span className="font-bold text-fg">{item.value} </span>
                {item.label}
              </span>
            </Badge>
            {i < items.length - 1 && (
              <span className="hidden sm:block w-px h-4 bg-border flex-shrink-0 ml-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
