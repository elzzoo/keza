"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

const COPY = {
  fr: {
    eyebrow: "Cash ou Miles ?",
    title: "Une erreur est survenue",
    description: "Quelque chose s'est mal passé. Vous pouvez réessayer ou revenir à l'accueil.",
    reference: "Référence",
    retry: "↻ Réessayer",
    homeHref: "/",
    homeCta: "← Retour à l'accueil",
  },
  en: {
    eyebrow: "Cash or Miles?",
    title: "Something went wrong",
    description: "Something went wrong. You can try again or return home.",
    reference: "Reference",
    retry: "↻ Try again",
    homeHref: "/en",
    homeCta: "← Back home",
  },
};

function getInitialLang() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/en") ? "en" : "fr";
}

function ErrorMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-10 w-10 text-amber-400" fill="none">
      <path d="M12 3l8 16H4L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const copy = COPY[getInitialLang()];

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-1">
        <span className="text-4xl font-black leading-none">
          <span className="text-primary">Xali</span>
          <span className="text-fg">fly</span>
        </span>
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          {copy.eyebrow}
        </span>
      </div>

      {/* Error badge */}
      <div className="w-20 h-20 rounded-2xl bg-surface border border-amber-500/30 flex items-center justify-center mb-6">
        <ErrorMark />
      </div>

      <h1 className="text-2xl font-black text-fg mb-2">{copy.title}</h1>
      <p className="text-sm text-muted max-w-sm mb-2">
        {copy.description}
      </p>
      {error.digest && (
        <p className="text-xs text-muted/50 font-mono mb-6">
          {copy.reference}: {error.digest}
        </p>
      )}
      {!error.digest && <div className="mb-6" />}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {copy.retry}
        </button>
        <Link
          href={copy.homeHref}
          className="px-6 py-2.5 rounded-xl bg-surface border border-border text-fg text-sm font-semibold hover:bg-surface-2 transition-colors"
        >
          {copy.homeCta}
        </Link>
      </div>
    </div>
  );
}
