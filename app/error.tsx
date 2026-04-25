"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-1">
        <span className="text-4xl font-black leading-none">
          <span className="text-primary">KE</span>
          <span className="text-fg">ZA</span>
        </span>
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          Cash ou Miles ?
        </span>
      </div>

      {/* Error badge */}
      <div className="w-20 h-20 rounded-2xl bg-surface border border-amber-500/30 flex items-center justify-center mb-6">
        <span className="text-3xl">⚠️</span>
      </div>

      <h1 className="text-2xl font-black text-fg mb-2">Une erreur est survenue</h1>
      <p className="text-sm text-muted max-w-sm mb-2">
        Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir à l&apos;accueil.
      </p>
      {error.digest && (
        <p className="text-xs text-muted/50 font-mono mb-6">
          Référence&nbsp;: {error.digest}
        </p>
      )}
      {!error.digest && <div className="mb-6" />}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          ↻ Réessayer
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-surface border border-border text-fg text-sm font-semibold hover:bg-surface-2 transition-colors"
        >
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
