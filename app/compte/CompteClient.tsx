"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface ServerProfile {
  balances:       Record<string, number>;
  bankPoints:     Record<string, number>;
  favoriteRoutes: { from: string; to: string }[];
  recentSearches: { from: string; to: string; date: string }[];
}

export function CompteClient() {
  const { data: session, status } = useSession();
  const [serverProfile, setServerProfile] = useState<ServerProfile | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  // Load server profile
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then((d: { profile?: ServerProfile } | null) => {
        if (d?.profile) setServerProfile(d.profile);
      })
      .catch(() => {});
  }, [session?.user?.email]);

  // Sync localStorage → server
  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const raw = localStorage.getItem("keza_profile");
      if (!raw) { setSyncMsg("Aucun profil local à synchroniser."); setSyncing(false); return; }
      const profile = JSON.parse(raw) as ServerProfile;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSyncMsg("✅ Profil synchronisé !");
        setServerProfile(profile);
      } else {
        setSyncMsg("Erreur lors de la synchronisation.");
      }
    } catch {
      setSyncMsg("Erreur — réessaie.");
    }
    setSyncing(false);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-3xl">🔒</p>
          <p className="text-sm text-muted">Tu n&apos;es pas connecté.</p>
          <Link href="/connexion" className="inline-block px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            Se connecter →
          </Link>
        </div>
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-bg">
      <nav className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-muted hover:text-fg transition-colors text-sm">← Xalifly</Link>
        <span className="text-border">·</span>
        <span className="text-sm font-bold text-fg">Mon compte</span>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Identity card */}
        <div className="bg-surface rounded-2xl border border-border p-5 flex items-center gap-4">
          {user.image ?? null ? (
            <Image src={user.image ?? ""} alt={user.name ?? "avatar"} width={56} height={56} className="w-14 h-14 rounded-2xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-black text-primary">
              {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {user.name && <p className="font-black text-fg">{user.name}</p>}
            <p className="text-sm text-muted truncate">{user.email}</p>
            <p className="text-[11px] text-muted/60 mt-0.5">Connecté via Google</p>
          </div>
        </div>

        {/* Sync card */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-black text-fg">Synchronisation des données</h2>
          <p className="text-xs text-muted">
            Ton wallet miles, tes favoris et tes recherches peuvent être synchronisés entre tous tes appareils.
          </p>

          {serverProfile ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-black text-fg">{Object.keys(serverProfile.balances ?? {}).length}</p>
                <p className="text-[10px] text-muted">programmes</p>
              </div>
              <div>
                <p className="text-lg font-black text-fg">{(serverProfile.favoriteRoutes ?? []).length}</p>
                <p className="text-[10px] text-muted">favoris</p>
              </div>
              <div>
                <p className="text-lg font-black text-fg">{(serverProfile.recentSearches ?? []).length}</p>
                <p className="text-[10px] text-muted">recherches</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">Aucune donnée synchronisée pour l&apos;instant.</p>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {syncing ? "Synchronisation…" : "⬆️ Synchroniser depuis cet appareil"}
          </button>
          {syncMsg && <p className="text-xs text-center text-success">{syncMsg}</p>}

          <Link href="/profil" className="block text-center text-xs text-primary hover:underline">
            Voir mon wallet miles →
          </Link>
        </div>

        {/* Danger zone */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-black text-fg">Compte</h2>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full py-2.5 rounded-xl border border-border text-sm text-muted hover:text-fg hover:border-primary/40 transition-colors"
          >
            Se déconnecter
          </button>
        </div>

      </div>
    </div>
  );
}
