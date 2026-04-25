"use client";

import { useState, useEffect, useCallback } from "react";

interface ReferralData {
  code: string;
  url: string;
  credits: number;
  conversions: number;
}

interface Props {
  email: string;
  token: string;
  lang?: "fr" | "en";
}

export function ReferralCard({ email, token, lang = "fr" }: Props) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/referral?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
      );
      if (res.ok) setData(await res.json() as ReferralData);
    } catch { /* silent */ }
  }, [email, token]);

  useEffect(() => { load(); }, [load]);

  async function copyLink() {
    if (!data) return;
    await navigator.clipboard.writeText(data.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!data) return null;

  const t = {
    title: lang === "fr" ? "Invitez un ami — gagnez +1 alerte" : "Invite a friend — earn +1 alert",
    desc: lang === "fr"
      ? "Partagez votre lien. Quand un ami crée sa première alerte, vous débloquez tous les deux une alerte bonus."
      : "Share your link. When a friend creates their first alert, you both unlock a bonus alert.",
    copy: lang === "fr" ? "Copier le lien" : "Copy link",
    copied: lang === "fr" ? "Copié !" : "Copied!",
    friends: lang === "fr" ? "ami(s) parrainé(s)" : "friend(s) referred",
    bonus: lang === "fr" ? "alerte(s) bonus débloquée(s)" : "bonus alert(s) unlocked",
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-lg">
          🎁
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">{t.title}</p>
          <p className="text-xs text-muted">{t.desc}</p>
        </div>
      </div>

      {/* Stats */}
      {(data.conversions > 0 || data.credits > 0) && (
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg bg-surface border border-border px-3 py-2 text-center">
            <p className="text-xl font-black text-primary">{data.conversions}</p>
            <p className="text-[10px] text-muted">{t.friends}</p>
          </div>
          <div className="flex-1 rounded-lg bg-surface border border-border px-3 py-2 text-center">
            <p className="text-xl font-black text-success">{data.credits}</p>
            <p className="text-[10px] text-muted">{t.bonus}</p>
          </div>
        </div>
      )}

      {/* Link + copy */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted truncate font-mono">
          {data.url}
        </div>
        <button
          onClick={copyLink}
          className="rounded-lg bg-primary text-white text-xs font-bold px-3 py-2 hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>
    </div>
  );
}
