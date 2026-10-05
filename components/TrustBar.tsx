import { Badge } from "@/components/ui";

interface Props { lang: "fr" | "en" }

type TrustIconName = "airport" | "program" | "airline" | "free";

function TrustIcon({ name }: { name: TrustIconName }) {
  const common = {
    className: "h-3.5 w-3.5",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "airport") {
    return (
      <svg {...common}>
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      </svg>
    );
  }
  if (name === "program") {
    return (
      <svg {...common}>
        <path d="M12 3 14.8 8.7 21 9.6l-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3Z" />
      </svg>
    );
  }
  if (name === "airline") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 0 20" />
        <path d="M12 2a15.3 15.3 0 0 0 0 20" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const ITEMS = {
  fr: [
    { icon: "airport" as const, value: "7 900+", label: "aéroports" },
    { icon: "program" as const, value: "33", label: "programmes miles" },
    { icon: "airline" as const, value: "120+", label: "compagnies" },
    { icon: "free" as const, value: "100%", label: "gratuit" },
  ],
  en: [
    { icon: "airport" as const, value: "7,900+", label: "airports" },
    { icon: "program" as const, value: "33", label: "miles programs" },
    { icon: "airline" as const, value: "120+", label: "airlines" },
    { icon: "free" as const, value: "100%", label: "free" },
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
              <span className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0" aria-hidden="true">
                <TrustIcon name={item.icon} />
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
