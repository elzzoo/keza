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
function fmt(n: number) {
  return n.toLocaleString("fr-FR");
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

// ─────────────────────────────────────────────────────────────────────────
export function ProfilClient() {
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
        <Link href="/" className="text-muted hover:text-fg transition-colors text-sm">
          ← Xalifly
        </Link>
        <span className="text-border">·</span>
        <span className="text-sm font-bold text-fg">Mon profil</span>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* Hero stat bar */}
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0">
              ✈️
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted">Total miles &amp; points</p>
              <p className="text-2xl font-black text-primary">{fmt(totalMiles)}</p>
              {totalMiles > 0 && (
                <p className="text-[11px] text-muted mt-0.5">
                  ≈ <span className="text-success font-semibold">${fmt(estimatedUsd)}</span> USD estimés
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Programmes</p>
              <p className="text-lg font-black text-fg">
                {Object.keys(profile.balances).length + Object.keys(profile.bankPoints).length}
              </p>
            </div>
          </div>

          {session?.user && (
            <div className="flex items-center gap-2 text-[11px] text-success mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span>Synchronisé avec {session.user.email}</span>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-black text-fg">{profile.recentSearches.length}</p>
              <p className="text-[10px] text-muted">recherches</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-fg">{profile.favoriteRoutes.length}</p>
              <p className="text-[10px] text-muted">favoris</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-success">{affordable.length}</p>
              <p className="text-[10px] text-muted">routes dispo</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
          {(["wallet", "recents", "favorites", "afford"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === t
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-fg",
              ].join(" ")}
            >
              {t === "wallet" && "💳 Wallet"}
              {t === "recents" && "🔍 Récents"}
              {t === "favorites" && "❤️ Favoris"}
              {t === "afford" && "🎯 Abordable"}
            </button>
          ))}
        </div>

        {/* ── WALLET tab ─────────────────────────────────────────────────── */}
        {tab === "wallet" && (
          <div className="space-y-4">
            {/* Miles programs */}
            <section className="bg-surface rounded-2xl border border-border p-5 space-y-4">
              <h2 className="text-sm font-black text-fg">Programmes miles</h2>

              {/* Existing balances */}
              {Object.keys(profile.balances).length === 0 ? (
                <p className="text-xs text-muted">Aucun programme ajouté.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(profile.balances).map(([prog, pts]) => (
                    <div key={prog} className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-fg truncate">{prog}</p>
                        <p className="text-[11px] text-primary font-semibold">{fmt(pts)} miles</p>
                      </div>
                      <button
                        onClick={() => removeBalance(prog)}
                        className="text-muted hover:text-error transition-colors text-xs px-2"
                        aria-label="Supprimer"
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
                  <option value="">Choisir un programme…</option>
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
              <h2 className="text-sm font-black text-fg">Points transferts bancaires</h2>
              <p className="text-[11px] text-muted -mt-2">
                Amex MR, Chase UR… transférables vers des compagnies aériennes.
              </p>

              {Object.keys(profile.bankPoints).length === 0 ? (
                <p className="text-xs text-muted">Aucun point bancaire ajouté.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(profile.bankPoints).map(([key, pts]) => (
                    <div key={key} className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-fg truncate">{key}</p>
                        <p className="text-[11px] text-primary font-semibold">{fmt(pts)} pts</p>
                      </div>
                      <button
                        onClick={() => removeBankPoints(key)}
                        className="text-muted hover:text-error transition-colors text-xs px-2"
                        aria-label="Supprimer"
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
                    <h2 className="text-sm font-black text-fg">Bonus de transfert actifs</h2>
                  </div>
                  <div className="space-y-2">
                    {activePromos.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-fg">
                            {b.from} → {b.to}
                          </p>
                          <p className="text-[11px] text-muted">
                            Jusqu&apos;au {b.promoValidUntil}
                          </p>
                        </div>
                        <span className="text-xs font-black text-amber-500">
                          +{Math.round((b.promoRatio! - 1) * 100)}% bonus
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
              <h2 className="text-sm font-black text-fg">Recherches récentes</h2>
              {profile.recentSearches.length > 0 && (
                <button
                  onClick={clearRecents}
                  className="text-[11px] text-muted hover:text-error transition-colors"
                >
                  Tout effacer
                </button>
              )}
            </div>

            {profile.recentSearches.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-3xl">🔍</p>
                <p className="text-xs text-muted">Aucune recherche enregistrée.</p>
                <Link href="/" className="text-xs text-primary hover:underline">
                  Lancer une recherche →
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
                      href={`/?${params}`}
                      className="flex items-center gap-3 bg-surface-2 hover:bg-surface-2/80 rounded-xl px-3 py-2.5 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-fg">
                          {airportLabel(s.from)} → {airportLabel(s.to)}
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
            <h2 className="text-sm font-black text-fg">Routes favorites</h2>

            {profile.favoriteRoutes.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-3xl">❤️</p>
                <p className="text-xs text-muted">
                  Aucun favori. Cliquez ❤️ sur un résultat pour sauvegarder une route.
                </p>
                <Link href="/" className="text-xs text-primary hover:underline">
                  Chercher un vol →
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
                          href={`/?${params}`}
                          className="text-xs font-bold text-fg hover:text-primary transition-colors"
                        >
                          {airportLabel(r.from)} → {airportLabelEn(r.to)}
                        </Link>
                        {meta && (
                          <p className="text-[11px] text-muted mt-0.5">
                            Éco: {fmt(meta.milesToEconomy)} miles
                            {meta.isNonstop && " · Direct"}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/vol/${r.from.toLowerCase()}-${r.to.toLowerCase()}`}
                        className="text-[10px] text-primary hover:underline px-1"
                      >
                        Page
                      </Link>
                      <button
                        onClick={() => removeFavorite(r.from, r.to)}
                        className="text-muted hover:text-error transition-colors text-xs px-2"
                        aria-label="Retirer des favoris"
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
              <h2 className="text-sm font-black text-fg">Ce que tu peux te payer</h2>
              <p className="text-[11px] text-muted mt-1">
                Routes accessibles avec tes miles actuels.
              </p>
            </div>

            {Object.keys(profile.balances).length === 0 && Object.keys(profile.bankPoints).length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-3xl">💳</p>
                <p className="text-xs text-muted">
                  Ajoute tes miles dans l&apos;onglet Wallet pour découvrir tes options.
                </p>
                <button
                  onClick={() => setTab("wallet")}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
                >
                  Configurer mon wallet →
                </button>
              </div>
            ) : affordable.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-3xl">😔</p>
                <p className="text-xs text-muted">
                  Aucune route accessible avec tes miles actuels.
                  <br />Essaie d&apos;accumuler plus de miles ou des points bancaires.
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
                      href={`/?${params}`}
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
                          {airportLabel(r.from)} → {airportLabel(r.to)}
                        </p>
                        <p className="text-[11px] text-muted">
                          via <span className="font-semibold text-fg/70">{r.program}</span>
                          {" · "}
                          {isBiz
                            ? <span className="text-amber-500 font-semibold">Business dispo ✦</span>
                            : <span>Éco: {fmt(r.meta.milesToEconomy)} miles</span>
                          }
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-bold text-primary">{fmt(r.available)}</p>
                        <p className="text-[9px] text-muted">miles dispo</p>
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
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            ✈️ Comparer un vol
          </Link>
        </div>
      </div>
    </div>
  );
}
