"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const fr = lang === "fr";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block bg-red-500/15 rounded-full p-4">
            <span className="text-4xl">⚠️</span>
          </div>

          <h1 className="text-3xl font-black text-fg">
            {fr ? "Erreur d'accès au vol" : "Flight access error"}
          </h1>

          <p className="text-muted max-w-md mx-auto">
            {fr
              ? "Désolé, nous ne pouvons pas charger les détails de ce vol. Essayez une nouvelle recherche ou retournez à l'accueil."
              : "Sorry, we couldn't load the flight details. Try searching again or return to the home page."
            }
          </p>

          {error.message && (
            <p className="text-xs text-muted/60 font-mono bg-surface-2 rounded-lg p-3 max-w-md mx-auto break-words">
              {error.message}
            </p>
          )}

          <div className="flex gap-3 justify-center pt-4">
            <button
              onClick={reset}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition-colors font-medium text-sm"
            >
              {fr ? "Réessayer" : "Try again"}
            </button>
            <Link
              href="/"
              className="bg-surface-2 border border-border text-fg px-4 py-2 rounded-lg hover:border-primary/40 transition-colors font-medium text-sm"
            >
              {fr ? "Retour à l'accueil" : "Back home"}
            </Link>
          </div>
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
