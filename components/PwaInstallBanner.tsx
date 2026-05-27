"use client";

import { useEffect, useState } from "react";

// BeforeInstallPromptEvent is not in standard TS lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "keza:pwa:install:dismissed";
const SEARCHES_KEY  = "keza:pwa:searches";

interface Props {
  lang: "fr" | "en";
  searchCount: number; // incremented by parent after each search
}

export function PwaInstallBanner({ lang, searchCount }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const fr = lang === "fr";

  // Capture the install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Show after 2 searches, if not already dismissed/installed
  useEffect(() => {
    if (!deferredPrompt || installed) return;
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch { /* ignore */ }
    if (searchCount >= 2) setVisible(true);
  }, [deferredPrompt, searchCount, installed]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* ignore */ }
  }

  if (!visible || installed) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-fade-up">
      <div className="bg-surface border border-primary/30 rounded-2xl shadow-2xl shadow-black/30 p-4 flex items-center gap-3">
        {/* App icon */}
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-xl">
          ✈️
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-fg leading-tight">
            {fr ? "Installer KEZA" : "Install KEZA"}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {fr ? "Accès rapide · comparaisons hors-ligne" : "Quick access · offline comparisons"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            {fr ? "Installer" : "Install"}
          </button>
          <button
            onClick={handleDismiss}
            className="w-6 h-6 flex items-center justify-center text-muted hover:text-fg transition-colors"
            aria-label="Dismiss"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
