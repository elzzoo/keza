"use client";

// global-error.tsx catches errors thrown by the root layout itself
// (e.g. a crash in a Provider that wraps the whole app).
// Unlike error.tsx it must render its own <html>/<body> since the layout is gone.
// https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs

import { useEffect } from "react";
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
    <html lang="fr">
      <body style={{ margin: 0, background: "#0a0a0f", color: "#e2e8f0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem", textAlign: "center" }}>
          {/* Logo */}
          <div style={{ marginBottom: "2rem" }}>
            <span style={{ fontSize: "2.5rem", fontWeight: 900, lineHeight: 1 }}>
              <span style={{ color: "#3b82f6" }}>KE</span>
              <span style={{ color: "#e2e8f0" }}>ZA</span>
            </span>
            <p style={{ margin: "4px 0 0", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b" }}>
              Cash ou Miles ?
            </p>
          </div>

          {/* Error badge */}
          <div style={{ width: 80, height: 80, borderRadius: 16, background: "#0f172a", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "2rem" }}>⚠️</span>
          </div>

          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0 0 0.5rem" }}>
            Une erreur critique est survenue
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", maxWidth: 360, margin: "0 auto 0.5rem" }}>
            L&apos;application a rencontré un problème inattendu. Réessayez ou revenez plus tard.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#475569", fontFamily: "monospace", margin: "0 0 1.5rem" }}>
              Réf : {error.digest}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{ padding: "0.625rem 1.5rem", borderRadius: 12, background: "#3b82f6", color: "white", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
            >
              ↻ Réessayer
            </button>
            <a
              href="/"
              style={{ padding: "0.625rem 1.5rem", borderRadius: 12, background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}
            >
              ← Accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
