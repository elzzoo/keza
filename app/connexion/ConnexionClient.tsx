"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const COPY = {
  fr: {
    subtitle: "Connecte-toi pour synchroniser ton wallet miles sur tous tes appareils.",
    continueGoogle: "Continuer avec Google",
    guestPrefix: "Tu peux aussi utiliser Xalifly sans compte.",
    backSearch: "Retour à la recherche →",
    privacyNote: "Tes données ne sont jamais partagées avec des tiers.",
    privacy: "Politique de confidentialité",
    homeHref: "/",
    privacyHref: "/confidentialite",
  },
  en: {
    subtitle: "Sign in to sync your miles wallet across all your devices.",
    continueGoogle: "Continue with Google",
    guestPrefix: "You can also use Xalifly without an account.",
    backSearch: "Back to search →",
    privacyNote: "Your data is never shared with third parties.",
    privacy: "Privacy policy",
    homeHref: "/en",
    privacyHref: "/en/privacy",
  },
} as const;

interface ConnexionClientProps {
  callbackUrl?: string;
  lang?: "fr" | "en";
}

function getSafeCallbackUrl(callbackUrl: string | undefined, lang: "fr" | "en") {
  const fallback = lang === "fr" ? "/profil" : "/en/profile";
  if (!callbackUrl) return fallback;

  try {
    const parsed = new URL(callbackUrl, "https://xalifly.local");
    if (parsed.origin !== "https://xalifly.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function ConnexionClient({
  callbackUrl,
  lang = "fr",
}: ConnexionClientProps) {
  const t = COPY[lang];
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl, lang);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <Link href={t.homeHref} className="text-2xl font-black text-primary">Xalifly</Link>
            <p className="text-sm text-muted mt-2">{t.subtitle}</p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
            <button
              onClick={() => signIn("google", { callbackUrl: safeCallbackUrl })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-bg hover:bg-surface-2 transition-colors text-sm font-semibold text-fg"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
              </svg>
              {t.continueGoogle}
            </button>

            <p className="text-center text-[11px] text-muted">
              {t.guestPrefix}{" "}
              <Link href={t.homeHref} className="text-primary hover:underline">{t.backSearch}</Link>
            </p>
          </div>

          <div className="text-center text-[11px] text-muted/60 space-y-1">
            <p>{t.privacyNote}</p>
            <p>
              <Link href={t.privacyHref} className="hover:underline">{t.privacy}</Link>
            </p>
          </div>
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
