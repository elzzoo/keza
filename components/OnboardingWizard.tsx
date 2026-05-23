"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";

// ─── Top programs shown in step 1 ────────────────────────────────────────────
// Ordered by global user relevance. Each has a flag emoji for quick recognition.
const TOP_PROGRAMS = [
  { name: "Flying Blue",                    flag: "🇫🇷", desc: "Air France / KLM" },
  { name: "British Airways Executive Club", flag: "🇬🇧", desc: "British Airways" },
  { name: "Singapore KrisFlyer",            flag: "🇸🇬", desc: "Singapore Airlines" },
  { name: "Emirates Skywards",              flag: "🇦🇪", desc: "Emirates" },
  { name: "United MileagePlus",             flag: "🇺🇸", desc: "United Airlines" },
  { name: "American AAdvantage",            flag: "🇺🇸", desc: "American Airlines" },
  { name: "Delta SkyMiles",                 flag: "🇺🇸", desc: "Delta Air Lines" },
  { name: "Air Canada Aeroplan",            flag: "🇨🇦", desc: "Air Canada" },
  { name: "ANA Mileage Club",               flag: "🇯🇵", desc: "All Nippon Airways" },
  { name: "Qatar Privilege Club",           flag: "🇶🇦", desc: "Qatar Airways" },
  { name: "Turkish Miles&Smiles",           flag: "🇹🇷", desc: "Turkish Airlines" },
  { name: "Etihad Guest",                   flag: "🇦🇪", desc: "Etihad Airways" },
] as const;

const L = {
  fr: {
    step1Title: "Vos programmes miles",
    step1Desc: "Sélectionnez les programmes que vous avez. Keza personnalisera vos résultats en priorité.",
    step2Title: "Vos soldes (optionnel)",
    step2Desc: "Entrez vos soldes pour voir si vous avez assez pour chaque vol.",
    skip: "Passer",
    next: "Suivant →",
    done: "Commencer →",
    later: "Plus tard",
    placeholder: "ex : 45000",
    miles: "miles",
    selectAll: "Tout sélectionner",
    none: "Aucun pour l'instant",
    progress: (step: number) => `Étape ${step}/2`,
  },
  en: {
    step1Title: "Your miles programs",
    step1Desc: "Select the programs you have. Keza will prioritize them in your results.",
    step2Title: "Your balances (optional)",
    step2Desc: "Enter your balances to see if you have enough miles for each flight.",
    skip: "Skip",
    next: "Next →",
    done: "Get started →",
    later: "Later",
    placeholder: "e.g. 45000",
    miles: "miles",
    selectAll: "Select all",
    none: "None for now",
    progress: (step: number) => `Step ${step}/2`,
  },
};

interface Props {
  lang?: "fr" | "en";
}

export function OnboardingWizard({ lang = "fr" }: Props) {
  const { profile, isLoaded, setPrograms, setBalances, update } = useProfile();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [balances, setLocalBalances] = useState<Record<string, string>>({});
  const t = L[lang];

  // Show wizard only to new users (no programs set, not onboarded)
  useEffect(() => {
    if (!isLoaded) return;
    if (!profile) return;
    if (profile.hasOnboarded) return;
    if (profile.programs.length > 0) return;
    // Small delay — let the page settle before showing modal
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [isLoaded, profile]);

  if (!visible) return null;

  function toggleProgram(name: string) {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  }

  function handleSkip() {
    update({ hasOnboarded: true });
    setVisible(false);
  }

  function handleNext() {
    if (selected.length === 0) {
      handleSkip();
      return;
    }
    setStep(2);
  }

  function handleDone() {
    // Save programs
    if (selected.length > 0) setPrograms(selected);

    // Save balances (non-empty only)
    const parsedBalances: Record<string, number> = {};
    for (const prog of selected) {
      const raw = balances[prog];
      const num = raw ? parseInt(raw.replace(/\D/g, ""), 10) : 0;
      if (num > 0) parsedBalances[prog] = num;
    }
    if (Object.keys(parsedBalances).length > 0) {
      setBalances(parsedBalances);
    }

    update({ hasOnboarded: true });
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/60 to-surface px-6 py-5 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">{t.progress(step)}</span>
            <button onClick={handleSkip} className="text-xs text-muted hover:text-fg transition-colors">
              {t.later}
            </button>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-border rounded-full mt-2">
            <div
              className="h-1 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${step === 1 ? 50 : 100}%` }}
            />
          </div>
          <h2 className="text-lg font-bold text-fg mt-3">
            {step === 1 ? t.step1Title : t.step2Title}
          </h2>
          <p className="text-sm text-muted mt-0.5">
            {step === 1 ? t.step1Desc : t.step2Desc}
          </p>
        </div>

        {/* Step 1: Program selection */}
        {step === 1 && (
          <>
            <div className="px-4 py-3 max-h-72 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {TOP_PROGRAMS.map(({ name, flag, desc }) => {
                  const active = selected.includes(name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleProgram(name)}
                      className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                        active
                          ? "bg-blue-500/20 border-blue-500/50 text-fg"
                          : "bg-card border-border text-muted hover:border-border/80 hover:bg-card/80"
                      }`}
                    >
                      <span className="text-base">{flag}</span>
                      <div className="text-[11px] font-semibold mt-0.5 leading-tight">{name}</div>
                      <div className="text-[10px] text-muted/70 truncate">{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-4 pb-4 pt-2 flex gap-2">
              <button
                onClick={handleSkip}
                className="flex-1 py-2.5 rounded-xl border border-border text-muted text-sm font-medium hover:bg-card transition-colors"
              >
                {t.none}
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors"
              >
                {selected.length === 0 ? t.skip : `${t.next} (${selected.length})`}
              </button>
            </div>
          </>
        )}

        {/* Step 2: Balances (optional) */}
        {step === 2 && (
          <>
            <div className="px-4 py-3 max-h-72 overflow-y-auto space-y-2">
              {selected.map((prog) => (
                <div key={prog} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2">
                  <div className="flex-1 text-sm font-medium text-fg truncate">{prog}</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={t.placeholder}
                      value={balances[prog] ?? ""}
                      onChange={(e) => setLocalBalances(prev => ({ ...prev, [prog]: e.target.value }))}
                      className="w-24 text-right px-2 py-1.5 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                    <span className="text-xs text-muted">{t.miles}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4 pt-2 flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl border border-border text-muted text-sm font-medium hover:bg-card transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleDone}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors"
              >
                {t.done}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
