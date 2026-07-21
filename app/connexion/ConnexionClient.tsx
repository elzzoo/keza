"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export function ConnexionClient() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="text-2xl font-black text-primary">Xalifly</Link>
          <p className="text-sm text-muted mt-2">Connecte-toi pour synchroniser ton wallet miles sur tous tes appareils.</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
          <button
            onClick={() => signIn("google", { callbackUrl: "/profil" })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-bg hover:bg-surface-2 transition-colors text-sm font-semibold text-fg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center text-[11px] text-muted">
            Tu peux aussi utiliser Xalifly sans compte.{" "}
            <Link href="/" className="text-primary hover:underline">Retour à la recherche →</Link>
          </p>
        </div>

        <div className="text-center text-[11px] text-muted/60 space-y-1">
          <p>Tes données ne sont jamais partagées avec des tiers.</p>
          <p>
            <Link href="/confidentialite" className="hover:underline">Politique de confidentialité</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
