"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  from: string;
  to: string;
  cabin: string;
  program: string;
  /** Current CPP (¢ per mile/point) for this option */
  currentCpp: number;
  /** Cash price at time of display */
  currentPrice: number;
  lang?: "fr" | "en";
}

const L = {
  fr: {
    cta: "Alerte miles",
    tooltip: "Recevoir un email quand ce programme vaut autant ou plus",
    title: "Alerte miles",
    desc: (program: string, cpp: string) =>
      `Recevez un email si ${program} reste à ≥${cpp}¢/pt sur cette route.`,
    email: "Votre email",
    btn: "Créer l'alerte",
    sending: "Création…",
    success: "Alerte créée ! Email si la valeur remonte à ce niveau.",
    error: "Erreur, réessayez.",
  },
  en: {
    cta: "Miles alert",
    tooltip: "Get notified when this program reaches this value or better",
    title: "Miles alert",
    desc: (program: string, cpp: string) =>
      `Get emailed if ${program} hits ≥${cpp}¢/pt on this route.`,
    email: "Your email",
    btn: "Create alert",
    sending: "Creating…",
    success: "Alert created! We'll email you when the value hits this level.",
    error: "Error, please retry.",
  },
};

export function MilesAlertButton({ from, to, cabin, program, currentCpp, currentPrice, lang = "fr" }: Props) {
  const t = L[lang];
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("keza:alertes:email") ?? "" : ""
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Target CPP: alert when CPP >= 90% of current value (still a solid deal)
  const targetCpp = Math.round(currentCpp * 0.9 * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          from,
          to,
          cabin,
          currentPrice,
          notifFrequency: "instant",
          milesAlert: { program, targetCpp, baseCpp: currentCpp },
        }),
      });
      if (res.ok || res.status === 201) {
        setStatus("success");
        toast.success(t.success);
        localStorage.setItem("keza:alertes:email", email.toLowerCase().trim());
        setTimeout(() => setOpen(false), 2000);
      } else {
        setStatus("error");
        toast.error(t.error);
      }
    } catch {
      setStatus("error");
      toast.error(t.error);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t.tooltip}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
      >
        <span>🔔</span>
        <span>{t.cta}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-border p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-fg text-lg">🔔 {t.title}</h3>
                <p className="text-sm text-muted mt-1">{t.desc(program, targetCpp.toFixed(2))}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-fg text-xl leading-none ml-2"
              >×</button>
            </div>

            <div className="bg-card rounded-xl p-3 flex items-center gap-3">
              <div className="text-2xl">✈</div>
              <div>
                <div className="text-xs text-muted">{from} → {to}</div>
                <div className="font-semibold text-amber-400">{program}</div>
                <div className="text-xs text-muted">{lang === "fr" ? "Valeur cible" : "Target value"} ≥{targetCpp.toFixed(2)}¢/pt</div>
              </div>
            </div>

            {status === "success" ? (
              <p className="text-center text-emerald-400 font-medium py-2">✓ {t.success}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder={t.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-fg placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors disabled:opacity-60"
                >
                  {status === "loading" ? t.sending : t.btn}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
