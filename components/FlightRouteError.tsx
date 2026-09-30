"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button, EmptyState, FieldMessage } from "@/components/ui";

type Lang = "fr" | "en";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  initialLang: Lang;
}

export function FlightRouteError({ error, reset, initialLang }: Props) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const fr = lang === "fr";
  const homeHref = fr ? "/" : "/en";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 flex flex-col items-center justify-center">
        <EmptyState
          icon={<span className="text-4xl">⚠️</span>}
          title={fr ? "Erreur d'accès au vol" : "Flight access error"}
          description={
            fr
              ? "Désolé, nous ne pouvons pas charger les détails de ce vol. Essayez une nouvelle recherche ou retournez à l'accueil."
              : "Sorry, we couldn't load the flight details. Try searching again or return to the home page."
          }
          className="w-full"
          action={(
            <div className="flex flex-wrap gap-3 justify-center">
              <Button type="button" onClick={reset}>
                {fr ? "Réessayer" : "Try again"}
              </Button>
              <Link
                href={homeHref}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-fg transition-all duration-150 hover:border-subtle hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {fr ? "Retour à l'accueil" : "Back home"}
              </Link>
            </div>
          )}
        >
          {error.message && (
            <FieldMessage tone="neutral" className="mx-auto mt-4 max-w-md break-words font-mono text-xs text-muted/70">
              {error.message}
            </FieldMessage>
          )}
        </EmptyState>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
