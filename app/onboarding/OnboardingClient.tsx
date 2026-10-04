"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type Lang = "fr" | "en";

const PROGRAMS = [
  { id: "Flying Blue", name: "Flying Blue (Air France/KLM)" },
  { id: "Singapore KrisFlyer", name: "Singapore KrisFlyer" },
  { id: "ANA Mileage Club", name: "ANA Mileage Club" },
  { id: "Japan Airlines Mileage Bank", name: "Japan Airlines Mileage Bank" },
  { id: "Emirates Skywards", name: "Emirates Skywards" },
  { id: "British Airways Avios", name: "British Airways Avios" },
  { id: "AAdvantage", name: "American AAdvantage" },
  { id: "Delta SkyMiles", name: "Delta SkyMiles" },
  { id: "United MileagePlus", name: "United MileagePlus" },
  { id: "Qatar Privilege Club", name: "Qatar Privilege Club" },
  { id: "Etihad Guest", name: "Etihad Guest" },
  { id: "Turkish Miles&Smiles", name: "Turkish Miles&Smiles" },
  { id: "Cathay Pacific Asia Miles", name: "Cathay Pacific Asia Miles" },
  { id: "Korean Air SKYPASS", name: "Korean Air SKYPASS" },
  { id: "LATAM Pass", name: "LATAM Pass" },
  { id: "Malaysian Airlines Enrich", name: "Malaysia Airlines Enrich" },
];

const COPY: Record<Lang, {
  title: string;
  description: string;
  skip: string;
  continue: string;
  saving: string;
  success: string;
  failure: string;
  error: string;
  note: string;
  homeHref: string;
}> = {
  fr: {
    title: "Configure ton profil",
    description:
      "Quels programmes de fidelite utilises-tu ? Nous afficherons les meilleurs deals de redemption.",
    skip: "Plus tard",
    continue: "Continuer",
    saving: "Enregistrement...",
    success: "Profil configure.",
    failure: "Impossible d'enregistrer le profil",
    error: "Erreur pendant l'enregistrement",
    note: "Tu peux modifier ces choix a tout moment dans ton compte.",
    homeHref: "/",
  },
  en: {
    title: "Set up your profile",
    description:
      "Which loyalty programs do you have? We'll show you the best redemption deals.",
    skip: "Skip for now",
    continue: "Continue",
    saving: "Saving...",
    success: "Profile set up.",
    failure: "Failed to save profile",
    error: "Error saving profile",
    note: "You can update this anytime in your account's settings.",
    homeHref: "/en",
  },
};

export function OnboardingClient({ lang = "fr" }: { lang?: Lang }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const t = COPY[lang];

  useEffect(() => {
    if (!session) {
      router.push(t.homeHref);
    }
  }, [session, router, t.homeHref]);

  async function handleSubmit() {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programs: selected,
          hasOnboarded: true,
        }),
      });
      if (res.ok) {
        toast.success(t.success);
        router.push(t.homeHref);
      } else {
        toast.error(t.failure);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  }

  const toggleProgram = (programId: string) => {
    setSelected((prev) =>
      prev.includes(programId)
        ? prev.filter((p) => p !== programId)
        : [...prev, programId]
    );
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} />
      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface rounded-2xl border border-border p-8">
            <h1 className="text-3xl font-black mb-2">{t.title}</h1>
            <p className="text-muted mb-6">
              {t.description}
            </p>

            {/* Program selector */}
            <div className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROGRAMS.map((prog) => (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => toggleProgram(prog.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selected.includes(prog.id)
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                        : "border-border bg-surface/50 text-muted hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(prog.id)}
                        onChange={() => {}}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">{prog.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-between">
              <button
                onClick={() => router.push(t.homeHref)}
                className="px-4 py-2 rounded-lg border border-border text-muted hover:border-border/80 transition-colors"
              >
                {t.skip}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || selected.length === 0}
                className="px-6 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-medium hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
              >
                {loading ? t.saving : t.continue}
              </button>
            </div>

            {/* Optional note */}
            <p className="text-xs text-muted mt-6 text-center">
              {t.note}
            </p>
          </div>
        </div>
      </main>
      <Footer lang={lang} />
    </div>
  );
}
