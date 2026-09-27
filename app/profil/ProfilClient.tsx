"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  loadProfile,
  saveProfile,
  type UserProfile,
  type RecentSearch,
  type FavoriteRoute,
  BANK_CURRENCIES,
} from "@/lib/userProfile";
import { ROUTE_META } from "@/data/routeMeta";
import { airportsMap } from "@/data/airports";
import { TRANSFER_BONUSES } from "@/data/transferBonuses";

// ── Canonical list of miles programs ──────────────────────────────────────
const LOYALTY_PROGRAMS = [
  "Flying Blue",
  "Miles&Smiles",
  "Avios",
  "British Airways Executive Club",
  "Delta SkyMiles",
  "United MileagePlus",
  "American AAdvantage",
  "Emirates Skywards",
  "Etihad Guest",
  "Qatar Privilege Club",
  "KrisFlyer",
  "Aeroplan",
  "LifeMiles",
  "LATAM Pass",
  "Miles&More",
  "ANA Mileage Club",
  "JAL Mileage Bank",
  "Asia Miles",
  "Qantas Points",
  "ShebaMiles",
  "Safar",
  "Turkish Miles&Smiles",
  "Virgin Points",
  "Korean Air SKYPASS",
];

// ── Format helpers ────────────────────────────────────────────────────────
function fmt(n: number, lang: "fr" | "en" = "fr") {
  return n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
}
function airportLabel(code: string) {
  const a = airportsMap[code];
  return a ? `${a.flag} ${a.city}` : code;
}
function airportLabelEn(code: string) {
  const a = airportsMap[code];
  return a ? `${a.flag} ${a.cityEn}` : code;
}
function routeKey(from: string, to: string) {
  return [from, to].sort().join("-");
}

// ── Affordability widget data ─────────────────────────────────────────────
interface AffordableRoute {
  from: string;
  to: string;
  meta: {
    milesToEconomy: number;
    milesToBusiness: number;
    airlines: string[];
    bestPrograms: string[];
    isNonstop: boolean;
  };
  program: string;
  available: number;
  cabinUnlocked: "economy" | "business" | "both";
}

function computeAffordable(profile: UserProfile): AffordableRoute[] {
  const allBalances: Record<string, number> = {
    ...profile.balances,
    ...profile.bankPoints,
  };
  if (Object.keys(allBalances).length === 0) return [];

  const results: AffordableRoute[] = [];

  for (const [key, meta] of ROUTE_META.entries()) {
    const [from, to] = key.split("-");
    if (!from || !to) continue;

    for (const [program, pts] of Object.entries(allBalances)) {
      if (pts <= 0) continue;

      const canEco = pts >= meta.milesToEconomy;
      const canBiz = pts >= meta.milesToBusiness;
      if (!canEco) continue;

      // Only include if this program is relevant to the route
      const relevant =
        meta.bestPrograms.some(p =>
          p.toLowerCase().includes(program.toLowerCase()) ||
          program.toLowerCase().includes(p.toLowerCase())
        ) || canBiz; // always show business if they can afford it

      if (!relevant && !canEco) continue;

      results.push({
        from,
        to,
        meta,
        program,
        available: pts,
        cabinUnlocked: canBiz ? "both" : "economy",
      });
    }
  }

  // Sort: business unlocked first, then by excess ratio
  return results
    .sort((a, b) => {
      if (a.cabinUnlocked === "both" && b.cabinUnlocked !== "both") return -1;
      if (b.cabinUnlocked === "both" && a.cabinUnlocked !== "both") return 1;
      return (b.available / b.meta.milesToEconomy) - (a.available / a.meta.milesToEconomy);
    })
    .slice(0, 12);
}

const COPY = {
  fr: {
    homeHref: "/",
    routePrefix: "/vol",
    title: "Mon profil",
    syncedWith: "Synchronisé avec",
    totalLabel: "Total miles & points",
    estimatedUsd: "USD estimés",
    programs: "Programmes",
    searches: "recherches",
    favorites: "favoris",
    availableRoutes: "routes dispo",
    tabs: {
      wallet: "💳 Wallet",
      recents: "🔍 Récents",
      favorites: "❤️ Favoris",
      afford: "🎯 Abordable",
    },
    milesPrograms: "Programmes miles",
    noProgram: "Aucun programme ajouté.",
    chooseProgram: "Choisir un programme…",
    delete: "Supprimer",
    bankPoints: "Points transferts bancaires",
    bankHint: "Amex MR, Chase UR… transférables vers des compagnies aériennes.",
    noBank: "Aucun point bancaire ajouté.",
    activeBonuses: "Bonus de transfert actifs",
    until: "Jusqu'au",
    bonus: "bonus",
    recentSearches: "Recherches récentes",
    clearAll: "Tout effacer",
    noSearch: "Aucune recherche enregistrée.",
    startSearch: "Lancer une recherche →",
    favoriteRoutes: "Routes favorites",
    noFavorites: "Aucun favori. Cliquez ❤️ sur un résultat pour sauvegarder une route.",
    searchFlight: "Chercher un vol →",
    page: "Page",
    removeFavorite: "Retirer des favoris",
    affordTitle: "Ce que tu peux te payer",
    affordHint: "Routes accessibles avec tes miles actuels.",
    addMilesHint: "Ajoute tes miles dans l'onglet Wallet pour découvrir tes options.",
    setupWallet: "Configurer mon wallet →",
    noAffordable: "Aucune route accessible avec tes miles actuels.",
    noAffordableHint: "Essaie d'accumuler plus de miles ou des points bancaires.",
    businessAvailable: "Business dispo ✦",
    economy: "Éco",
    availableMiles: "miles dispo",
    compareFlight: "✈️ Comparer un vol",
    nonstop: "Direct",
  },
  en: {
    homeHref: "/en",
    routePrefix: "/en/vol",
    title: "My profile",
    syncedWith: "Synced with",
    totalLabel: "Total miles & points",
    estimatedUsd: "estimated USD",
    programs: "Programs",
    searches: "searches",
    favorites: "favorites",
    availableRoutes: "available routes",
    tabs: {
      wallet: "💳 Wallet",
      recents: "🔍 Recent",
      favorites: "❤️ Favorites",
      afford: "🎯 Affordable",
    },
    milesPrograms: "Miles programs",
    noProgram: "No program added yet.",
    chooseProgram: "Choose a program…",
    delete: "Delete",
    bankPoints: "Bank transfer points",
    bankHint: "Amex MR, Chase UR… transferable to airlines.",
    noBank: "No bank points added yet.",
    activeBonuses: "Active transfer bonuses",
    until: "Until",
    bonus: "bonus",
    recentSearches: "Recent searches",
    clearAll: "Clear all",
    noSearch: "No saved search yet.",
    startSearch: "Start a search →",
    favoriteRoutes: "Favorite routes",
    noFavorites: "No favorite yet. Click ❤️ on a result to save a route.",
    searchFlight: "Search a flight →",
    page: "Page",
    removeFavorite: "Remove from favorites",
    affordTitle: "What you can afford",
    affordHint: "Routes reachable with your current miles.",
    addMilesHint: "Add your miles in the Wallet tab to discover your options.",
    setupWallet: "Set up my wallet →",
    noAffordable: "No route reachable with your current miles.",
    noAffordableHint: "Try collecting more miles or bank points.",
    businessAvailable: "Business available ✦",
    economy: "Economy",
    availableMiles: "miles available",
    compareFlight: "✈️ Compare a flight",
    nonstop: "Nonstop",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────
export function ProfilClient({ lang = "fr" }: { lang?: "fr" | "en" }) {
  const t = COPY[lang];
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<"wallet" | "recents" | "favorites" | "afford">("wallet");

  // Wallet edit state
  const [editProgram, setEditProgram] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editBank, setEditBank] = useState<string>(BANK_CURRENCIES[0].key);
  const [editBankAmount, setEditBankAmount] = useState("");

  const { data: session } = useSession();

  const syncToServer = useCallback(() => {
    if (!session?.user?.email) return;
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loadProfile()),
    }).catch(() => {});
  }, [session?.user?.email]);

  useEffect(() => {
    const local = loadProfile();
    setProfile(local);

    if (session?.user?.email) {
      fetch("/api/profile")
        .then(r => r.ok ? r.json() : null)
        .then((d: { profile?: Partial<UserProfile> } | null) => {
          if (d?.profile) {
            setProfile(prev => prev ? {
              ...prev,
              balances:       d.profile!.balances       ?? prev.balances,
              bankPoints:     d.profile!.bankPoints      ?? prev.bankPoints,
              favoriteRoutes: d.profile!.favoriteRoutes  ?? prev.favoriteRoutes,
              recentSearches: d.profile!.recentSearches  ?? prev.recentSearches,
            } : prev);
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  const reload = useCallback(() => setProfile(loadProfile()), []);

  // ── Wallet actions ────────────────────────────────────────────────────
  function addBalance() {
    if (!profile || !editProgram || !editAmount) return;
    const pts = parseInt(editAmount.replace(/\D/g, ""), 10);
    if (!pts || pts <= 0) return;
    const next = { ...profile, balances: { ...profile.balances, [editProgram]: pts } };
    saveProfile(next);
    setEditProgram("");
    setEditAmount("");
    reload();
    syncToServer();
  }

  function removeBalance(prog: string) {
    if (!profile) return;
    const rest = Object.fromEntries(Object.entries(profile.balances).filter(([k]) => k !== prog));
    saveProfile({ ...profile, balances: rest });
    reload();
    syncToServer();
  }

  function addBankPoints() {
    if (!profile || !editBank || !editBankAmount) return;
    const pts = parseInt(editBankAmount.replace(/\D/g, ""), 10);
    if (!pts || pts <= 0) return;
    const next = { ...profile, bankPoints: { ...profile.bankPoints, [editBank]: pts } };
    saveProfile(next);
    setEditBankAmount("");
    reload();
    syncToServer();
  }

  function removeBankPoints(key: string) {
    if (!profile) return;
    const rest = Object.fromEntries(Object.entries(profile.bankPoints).filter(([k]) => k !== key));
    saveProfile({ ...profile, bankPoints: rest });
    reload();
    syncToServer();
  }

  function clearRecents() {
    if (!profile) return;
    saveProfile({ ...profile, recentSearches: [] });
    reload();
    syncToServer();
  }

  function removeFavorite(from: string, to: string) {
    if (!profile) return;
    const favoriteRoutes = profile.favoriteRoutes.filter(r => !(r.from === from && r.to === to));
    saveProfile({ ...profile, favoriteRoutes });
    reload();
    syncToServer();
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const totalMiles =
    Object.values(profile.balances).reduce((a, b) => a + b, 0) +
    Object.values(profile.bankPoints).reduce((a, b) => a + b, 0);

  // Estimated cash value at ~1.5 cpp (conservative industry average)
  const estimatedUsd = Math.round(totalMiles * 0.015);

  const affordable = computeAffordable(profile);

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href={t.homeHref} className="text-muted hover:text-fg transition-colors text-sm">
          ← Xalifly
        </Link>
        <span className="text-border">·</span>
        <span className="text-sm font-bold text-fg">{t.title}</span>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* Hero stat bar */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0">
              ✈️
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted">{t.totalLabel}</p>
              <p className="text-2xl font-black text-primary">{fmt(totalMiles, lang)}</p>
              {totalMiles > 0 && (
                <p className="text-[11px] text-muted mt-0.5">
                  ≈ <span className="text-success font-semibold">${fmt(estimatedUsd, lang)}</span> {t.estimatedUsd}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">{t.programs}</p>
              <p className="text-lg font-black text-fg">
                {Object.keys(profile.balances).length + Object.keys(profile.bankPoints).length}
              </p>
            </div>
          </div>

          {session?.user && (
            <div className="flex items-center gap-2 text-[11px] text-success mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span>{t.syncedWith} {session.user.email}</span>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-black text-fg">{profile.recentSearches.length}</p>
              <p className="text-[10px] text-muted">{t.searches}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-fg">{profile.favoriteRoutes.length}</p>
              <p className="text-[10px] text-muted">{t.favorites}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-success">{affordable.length}</p>
              <p className="text-[10px] text-muted">{t.availableRoutes}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
          {(["wallet", "recents", "favorites", "afford"] as const).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={[
                "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === tabKey
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-fg",
              ].join(" ")}
            >
              {t.tabs[tabKey]}
            </button>
          ))}
        </div>

        {/* ── WALLET tab ─────────────────────────────────────────────────── */}
        {tab === "wallet" && (
          <div className="space-y-4">
            {/* Miles programs */}
            <section className="bg-surface rounded-2xl border border-border p-5 space-y-4">
              <h2 className="text-sm font-black text-fg">{t.milesPrograms}</h2>

              {/* Existing balances */}
              {Object.keys(profile.balances).length === 0 ? (
                <p className="text-xs text-muted">{t.noProgram}</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(profile.balances).map(([prog, pts]) => (
                    <div key={prog} className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-fg truncate">{prog}</p>
                        <p className="text-[11px] text-primary font-semibold">{fmt(pts, lang)} miles</p>
                      </div>
                      <button
                        onClick={() => removeBalance(prog)}
                        className="text-muted hover:text-error transition-colors text-xs px-2"
                        aria-label={t.delete}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add program */}
              <div className="flex gap-2">
                <select
                  value={editProgram}
                  onChange={e => setEditProgram(e.target.value)}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-fg focus:outline-none focus:border-primary/50"
                >
                  <option value="">{t.chooseProgram}</option>
                  {LOYALTY_PROGRAMS.filter(p => !profile.balances[p]).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Miles"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="w-24 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-fg focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={addBalance}
                  disabled={!editProgram || !editAmount}
                  className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  +
                </button>
              </div>
            </section>

            {/* Bank transfer points */}
            <section className="bg-surface rounded-2xl border border-border p-5 space-y-4">
              <h2 className="text-sm font-black text-fg">{t.bankPoints}</h2>
              <p className="text-[11px] text-muted -mt-2">
                {t.bankHint}
              </p>

              {Object.keys(profile.bankPoints).length === 0 ? (
                <p className="text-xs text-muted">{t.noBank}</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(profile.bankPoints).map(([key, pts]) => (
                    <div key={key} className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-fg truncate">{key}</p>
                        <p className="text-[11px] text-primary font-semibold">{fmt(pts, lang)} pts</p>
                      </div>
                      <button
                        onClick={() => removeBankPoints(key)}
                        className="text-muted hover:text-error transition-colors text-xs px-2"
                        aria-label={t.delete}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <select
                  value={editBank}
                  onChange={e => setEditBank(e.target.value)}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-fg focus:outline-none focus:border-primary/50"
                >
                  {BANK_CURRENCIES.map(b => (
                    <option key={b.key} value={b.key}>{b.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Points"
                  value={editBankAmount}
                  onChange={e => setEditBankAmount(e.target.value)}
                  className="w-24 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-fg focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={addBankPoints}
                  disabled={!editBankAmount}
                  className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  +
                </button>
              </div>
            </section>

            {/* Active transfer bonuses */}
            {(() => {
              const today = new Date().toISOString().slice(0, 10);
              const activePromos = TRANSFER_BONUSES.filter(
                b => b.promoRatio && b.promoValidUntil && b.promoValidUntil >= today
              );
              if (activePromos.length === 0) return null;
              return (
                <section className="bg-surface rounded-2xl border border-amber-500/30 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎁</span>
                    <h2 className="text-sm font-black text-fg">{t.activeBonuses}</h2>
                  </div>
                  <div className="space-y-2">
                    {activePromos.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-fg">
                            {b.from} → {b.to}
                          </p>
                          <p className="text-[11px] text-muted">
                            {t.until} {b.promoValidUntil}
                          </p>
                        </div>
                        <span className="text-xs font-black text-amber-500">
                          +{Math.round((b.promoRatio! - 1) * 100)}% {t.bonus}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}
          </div>
        )}

        {/* ── RECENTS tab ────────────────────────────────────────────────── */}
        {tab === "recents" && (
          <section className="bg-surface rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-fg">{t.recentSearches}</h2>
              {profile.recentSearches.length > 0 && (
                <button
                  onClick={clearRecents}
                  className="text-[11px] text-muted hover:text-error transition-colors"
                >
                  {t.clearAll}
                </button>
              )}
            </div>

            {profile.recentSearches.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-3xl">🔍</p>
                <p className="text-xs text-muted">{t.noSearch}</p>
                <Link href={t.homeHref} className="text-xs text-primary hover:underline">
                  {t.startSearch}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {profile.recentSearches.map((s: RecentSearch, i) => {
                  const params = new URLSearchParams({
                    from: s.from,
                    to: s.to,
                    date: s.date,
                    cabin: s.cabin,
                    trip: s.tripType,
                  });
                  return (
                    <Link
                      key={i}
                      href={`${t.homeHref}?${params}`}
                      className="flex items-center gap-3 bg-surface-2 hover:bg-surface-2/80 rounded-xl px-3 py-2.5 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-fg">
                          {(lang === "fr" ? airportLabel : airportLabelEn)(s.from)} → {(lang === "fr" ? airportLabel : airportLabelEn)(s.to)}
                        </p>
                        <p className="text-[11px] text-muted">
                          {s.date} · {s.cabin}
                          {s.recommendation === "USE_MILES" && (
                            <span className="ml-2 text-success font-semibold">✓ Miles</span>
                          )}
                          {s.recommendation === "USE_CASH" && (
                            <span className="ml-2 text-warning font-semibold">Cash</span>
                          )}
                        </p>
                      </div>
                      <span className="text-muted group-hover:text-fg text-xs transition-colors">→</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── FAVORITES tab ──────────────────────────────────────────────── */}
        {tab === "favorites" && (
          <section className="bg-surface rounded-2xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-black text-fg">{t.favoriteRoutes}</h2>

            {profile.favoriteRoutes.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-3xl">❤️</p>
                <p className="text-xs text-muted">
                  {t.noFavorites}
                </p>
                <Link href={t.homeHref} className="text-xs text-primary hover:underline">
                  {t.searchFlight}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {profile.favoriteRoutes.map((r: FavoriteRoute) => {
                  const key = routeKey(r.from, r.to);
                  const meta = ROUTE_META.get(key);
                  const params = new URLSearchParams({ from: r.from, to: r.to });
                  return (
                    <div key={key} className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`${t.homeHref}?${params}`}
                          className="text-xs font-bold text-fg hover:text-primary transition-colors"
                        >
                          {(lang === "fr" ? airportLabel : airportLabelEn)(r.from)} → {(lang === "fr" ? airportLabel : airportLabelEn)(r.to)}
                        </Link>
                        {meta && (
                          <p className="text-[11px] text-muted mt-0.5">
                            {t.economy}: {fmt(meta.milesToEconomy, lang)} miles
                            {meta.isNonstop && ` · ${t.nonstop}`}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`${t.routePrefix}/${r.from.toLowerCase()}-${r.to.toLowerCase()}`}
                        className="text-[10px] text-primary hover:underline px-1"
                      >
                        {t.page}
                      </Link>
                      <button
                        onClick={() => removeFavorite(r.from, r.to)}
                        className="text-muted hover:text-error transition-colors text-xs px-2"
                        aria-label={t.removeFavorite}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── AFFORDABLE tab ─────────────────────────────────────────────── */}
        {tab === "afford" && (
          <section className="bg-surface rounded-2xl border border-border p-5 space-y-4">
            <div>
              <h2 className="text-sm font-black text-fg">{t.affordTitle}</h2>
              <p className="text-[11px] text-muted mt-1">
                {t.affordHint}
              </p>
            </div>

            {Object.keys(profile.balances).length === 0 && Object.keys(profile.bankPoints).length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-3xl">💳</p>
                <p className="text-xs text-muted">
                  {t.addMilesHint}
                </p>
                <button
                  onClick={() => setTab("wallet")}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
                >
                  {t.setupWallet}
                </button>
              </div>
            ) : affordable.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-3xl">😔</p>
                <p className="text-xs text-muted">
                  {t.noAffordable}
                  <br />{t.noAffordableHint}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {affordable.map((r, i) => {
                  const params = new URLSearchParams({ from: r.from, to: r.to });
                  const isBiz = r.cabinUnlocked === "both";
                  return (
                    <Link
                      key={i}
                      href={`${t.homeHref}?${params}`}
                      className="flex items-center gap-3 bg-surface-2 hover:bg-surface-2/80 rounded-xl px-3 py-3 transition-colors group"
                    >
                      {/* Cabin badge */}
                      <div className={[
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0",
                        isBiz ? "bg-amber-400/10 border border-amber-400/30" : "bg-primary/10 border border-primary/20",
                      ].join(" ")}>
                        {isBiz ? "💺" : "🪑"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-fg">
                          {(lang === "fr" ? airportLabel : airportLabelEn)(r.from)} → {(lang === "fr" ? airportLabel : airportLabelEn)(r.to)}
                        </p>
                        <p className="text-[11px] text-muted">
                          via <span className="font-semibold text-fg/70">{r.program}</span>
                          {" · "}
                          {isBiz
                            ? <span className="text-amber-500 font-semibold">{t.businessAvailable}</span>
                            : <span>{t.economy}: {fmt(r.meta.milesToEconomy, lang)} miles</span>
                          }
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-bold text-primary">{fmt(r.available, lang)}</p>
                        <p className="text-[9px] text-muted">{t.availableMiles}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Footer CTA */}
        <div className="text-center pb-4">
          <Link
            href={t.homeHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            {t.compareFlight}
          </Link>
        </div>
      </div>
    </div>
  );
}
