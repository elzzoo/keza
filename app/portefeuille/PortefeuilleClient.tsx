"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useProfile } from "@/hooks/useProfile";
import { useProAccess } from "@/hooks/useProAccess";
import { ProUpgradeCard } from "@/components/ProUpgradeCard";
import { BalanceSyncWidget } from "@/components/BalanceSyncWidget";
import { GLOBAL_PROGRAMS } from "@/lib/globalPrograms";
import { BANK_CURRENCIES } from "@/lib/userProfile";
import type { RecentSearch } from "@/lib/userProfile";

// ─── Top 10 common programs ────────────────────────────────────────────────────

const TOP_PROGRAM_NAMES = [
  "Flying Blue",
  "Chase Ultimate Rewards",
  "ANA Mileage Club",
  "Singapore KrisFlyer",
  "Emirates Skywards",
  "British Airways Avios",
  "United MileagePlus",
  "Delta SkyMiles",
  "Air Canada Aeroplan",
  "Iberia Avios Plus",
];

// Build lookup maps from GLOBAL_PROGRAMS
const PROGRAM_MAP = Object.fromEntries(GLOBAL_PROGRAMS.map((p) => [p.name, p]));

const TOP_PROGRAMS = TOP_PROGRAM_NAMES
  .map((name) => PROGRAM_MAP[name])
  .filter(Boolean);

const OTHER_PROGRAMS = GLOBAL_PROGRAMS.filter(
  (p) => !TOP_PROGRAM_NAMES.includes(p.name)
);

// ─── Bank currency display value ───────────────────────────────────────────────
// Default 1 cent per point as per spec
const BANK_POINT_VALUE_CENTS = 1;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatUSD(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

function valueBadgeClass(totalUSD: number): string {
  if (totalUSD > 500)
    return "bg-success/10 border border-success/20 text-success";
  if (totalUSD > 100)
    return "bg-warning/10 border border-warning/20 text-warning";
  return "bg-surface-2 border border-border text-muted";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProgramRow({
  name,
  marketValueCents,
  value,
  onChange,
}: {
  name: string;
  marketValueCents: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">{name}</p>
        <p className="text-xs text-muted">{marketValueCents.toFixed(1)}¢/mile</p>
      </div>
      <div className="flex items-center gap-2">
        {value > 0 && (
          <span className="text-xs text-primary font-semibold hidden sm:block">
            {formatUSD(value * marketValueCents)}
          </span>
        )}
        <input
          type="number"
          min={0}
          step={1000}
          placeholder="0"
          value={typeof value === "number" ? (value === 0 ? "" : value.toString()) : ""}
          onChange={(e) => {
            const inputValue = e.target.value.trim();
            const parsed = inputValue === "" ? 0 : parseInt(inputValue, 10);
            onChange(Math.max(0, isNaN(parsed) ? 0 : parsed));
          }}
          className="w-28 bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-fg text-right placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
      </div>
    </div>
  );
}

function BankRow({
  label,
  value,
  onChange,
}: {
  bankKey?: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">{label}</p>
        <p className="text-xs text-muted">{BANK_POINT_VALUE_CENTS.toFixed(1)}¢/point</p>
      </div>
      <div className="flex items-center gap-2">
        {value > 0 && (
          <span className="text-xs text-primary font-semibold hidden sm:block">
            {formatUSD(value * BANK_POINT_VALUE_CENTS)}
          </span>
        )}
        <input
          type="number"
          min={0}
          step={1000}
          placeholder="0"
          value={typeof value === "number" ? (value === 0 ? "" : value.toString()) : ""}
          onChange={(e) => {
            const inputValue = e.target.value.trim();
            const parsed = inputValue === "" ? 0 : parseInt(inputValue, 10);
            onChange(Math.max(0, isNaN(parsed) ? 0 : parsed));
          }}
          className="w-28 bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-fg text-right placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
      </div>
    </div>
  );
}

function RecentSearchRow({ search, lang }: { search: RecentSearch; lang: "fr" | "en" }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-fg">
          {search.from} → {search.to}
        </span>
        <span className="text-xs text-muted">{search.cabin}</span>
      </div>
      {search.bestSavings !== undefined && search.bestSavings > 0 && (
        <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
          {lang === "fr" ? "Économie" : "Savings"}: {formatUSD(search.bestSavings * 100)}
        </span>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PortefeuilleClient() {
  const { profile, isLoaded, setBalances, setBankPoints } = useProfile();
  const { isActive: hasProAccess, daysLeft, loading } = useProAccess();
  const { data: session } = useSession();
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [showOtherPrograms, setShowOtherPrograms] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const fetchLastSync = async () => {
      try {
        const res = await fetch("/api/balance/sync-time");
        if (res.ok) {
          const data = await res.json();
          setLastSync(data.lastSync ? new Date(data.lastSync) : null);
        }
      } catch (err) {
        console.error("Failed to fetch sync time:", err);
      }
    };
    fetchLastSync();
  }, [session?.user?.email]);

  const handleRefresh = async () => {
    try {
      await fetch("/api/balance/sync", { method: "POST" });
      const res = await fetch("/api/balance/sync-time");
      if (res.ok) {
        const data = await res.json();
        setLastSync(data.lastSync ? new Date(data.lastSync) : null);
      }
    } catch (err) {
      console.error("Failed to refresh balances:", err);
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────────

  const balances = profile?.balances ?? {};
  const bankPoints = profile?.bankPoints ?? {};

  const milesValueCents = GLOBAL_PROGRAMS.reduce((sum, p) => {
    const bal = balances[p.name] ?? 0;
    return sum + bal * p.marketValueCents;
  }, 0);

  const bankValueCents = Object.values(bankPoints).reduce(
    (sum, v) => sum + v * BANK_POINT_VALUE_CENTS,
    0
  );

  const totalValueCents = milesValueCents + bankValueCents;
  const totalValueUSD = totalValueCents / 100;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleBalanceChange(programName: string, value: number) {
    if (!profile) return;
    setBalances({ ...profile.balances, [programName]: value });
  }

  function handleBankPointChange(key: string, value: number) {
    if (!profile) return;
    setBankPoints({ ...profile.bankPoints, [key]: value });
  }

  // ── Skeleton while loading ──────────────────────────────────────────────────

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Header lang={lang} onLangChange={setLang} />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface-2 rounded-xl w-2/3" />
            <div className="h-4 bg-surface-2 rounded-xl w-1/2" />
            <div className="h-48 bg-surface-2 rounded-2xl" />
            <div className="h-48 bg-surface-2 rounded-2xl" />
          </div>
        </main>
        <Footer lang={lang} />
      </div>
    );
  }

  const recentSearches = profile?.recentSearches ?? [];

  return (
    <div className="min-h-screen bg-bg">
      <Header lang={lang} onLangChange={setLang} />

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-black text-fg">
            <span className="text-primary">
              {lang === "fr" ? "Mon " : "My Miles "}
            </span>
            {lang === "fr" ? "Portefeuille" : "Portfolio"}
          </h1>
          <p className="text-sm text-muted mt-1.5">
            {lang === "fr"
              ? "Renseignez vos soldes miles et points — KEZA calcule la valeur totale de votre portefeuille."
              : "Enter your miles and points balances — KEZA computes the total value of your portfolio."}
          </p>
        </div>

        {/* ── Pro access status ────────────────────────────────────────────── */}
        {!hasProAccess && <ProUpgradeCard daysLeft={daysLeft} />}

        {hasProAccess && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-6">
            <p className="text-sm text-blue-800">
              {daysLeft !== null && daysLeft > 0
                ? `Essai gratuit actif: ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant`
                : "KEZA Pro actif"}
            </p>
          </div>
        )}

        {/* ── Balance sync widget ──────────────────────────────────────────── */}
        <BalanceSyncWidget lastSync={lastSync} onRefresh={handleRefresh} />

        {/* ── Total value card ─────────────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
            {lang === "fr" ? "Valeur totale du portefeuille" : "Total portfolio value"}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-fg">
              ${totalValueUSD.toFixed(2)}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${valueBadgeClass(totalValueUSD)}`}
            >
              {totalValueUSD > 500
                ? lang === "fr" ? "Excellent" : "Excellent"
                : totalValueUSD > 100
                ? lang === "fr" ? "Bon" : "Good"
                : lang === "fr" ? "À constituer" : "Building up"}
            </span>
          </div>
          {totalValueCents > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-surface-2 rounded-xl p-3">
                <p className="text-xs text-muted mb-0.5">
                  {lang === "fr" ? "Miles programmes" : "Program miles"}
                </p>
                <p className="text-sm font-bold text-fg">${(milesValueCents / 100).toFixed(2)}</p>
              </div>
              <div className="bg-surface-2 rounded-xl p-3">
                <p className="text-xs text-muted mb-0.5">
                  {lang === "fr" ? "Points transférables" : "Transferable points"}
                </p>
                <p className="text-sm font-bold text-fg">${(bankValueCents / 100).toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Miles balances editor ─────────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-fg">
              {lang === "fr" ? "Soldes miles par programme" : "Miles balances by program"}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {lang === "fr"
                ? "Les 10 programmes les plus courants"
                : "The 10 most common programs"}
            </p>
          </div>

          <div>
            {TOP_PROGRAMS.map((p) => (
              <ProgramRow
                key={p.name}
                name={p.name}
                marketValueCents={p.marketValueCents}
                value={balances[p.name] ?? 0}
                onChange={(v) => handleBalanceChange(p.name, v)}
              />
            ))}
          </div>

          {/* Toggle other programs */}
          <button
            onClick={() => setShowOtherPrograms((v) => !v)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-muted hover:text-fg border border-border/50 rounded-xl hover:bg-surface-2 transition-all"
          >
            {showOtherPrograms
              ? lang === "fr" ? "Masquer les autres programmes" : "Hide other programs"
              : lang === "fr"
              ? `Afficher ${OTHER_PROGRAMS.length} autres programmes`
              : `Show ${OTHER_PROGRAMS.length} more programs`}
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showOtherPrograms ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showOtherPrograms && (
            <div className="mt-3 border-t border-border pt-3">
              {OTHER_PROGRAMS.map((p) => (
                <ProgramRow
                  key={p.name}
                  name={p.name}
                  marketValueCents={p.marketValueCents}
                  value={balances[p.name] ?? 0}
                  onChange={(v) => handleBalanceChange(p.name, v)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Bank points editor ────────────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-fg">
              {lang === "fr" ? "Points transférables" : "Transferable points"}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {lang === "fr"
                ? "Points bancaires / cartes de crédit transférables vers des programmes miles"
                : "Bank / credit card points transferable to miles programs"}
            </p>
          </div>

          {BANK_CURRENCIES.map((b) => (
            <BankRow
              key={b.key}
              bankKey={b.key}
              label={b.label}
              value={bankPoints[b.key] ?? 0}
              onChange={(v) => handleBankPointChange(b.key, v)}
            />
          ))}
        </div>

        {/* ── Recent searches ───────────────────────────────────────────────── */}
        {recentSearches.length > 0 && (
          <div className="bg-surface rounded-2xl border border-border p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-fg">
                {lang === "fr" ? "Recherches récentes" : "Recent searches"}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {lang === "fr"
                  ? "Vos dernières routes analysées"
                  : "Your last analyzed routes"}
              </p>
            </div>
            {recentSearches.map((s, i) => (
              <RecentSearchRow key={i} search={s} lang={lang} />
            ))}
          </div>
        )}

        {/* ── Tips card ─────────────────────────────────────────────────────── */}
        <div className="bg-primary-dim border border-primary/20 rounded-2xl p-5">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5">
            {lang === "fr" ? "Astuce" : "Tip"}
          </p>
          <p className="text-sm text-fg/80">
            {lang === "fr"
              ? "Vos soldes sont sauvegardés localement sur votre appareil. Renseignez-les une fois, KEZA vérifie automatiquement si vous pouvez vous payer un vol en miles lors de vos prochaines recherches."
              : "Your balances are saved locally on your device. Enter them once and KEZA will automatically check if you can afford a flight in miles on your next searches."}
          </p>
        </div>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
