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

  function shareWhatsApp() {
    if (!data) return;
    const text = lang === "fr"
      ? `Utilise Xalifly pour comparer les prix de vols cash vs miles: ${data.url}`
      : `Use Xalifly to compare flight prices cash vs miles: ${data.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  if (!data) return null;

  const t = {
    title: lang === "fr" ? "Invitez un ami — gagnez +1 alerte" : "Invite a friend — earn +1 alert",
    desc: lang === "fr"
      ? "Partagez votre lien. Quand un ami crée sa première alerte, vous débloquez tous les deux une alerte bonus."
      : "Share your link. When a friend creates their first alert, you both unlock a bonus alert.",
    copy: lang === "fr" ? "Copier" : "Copy",
    copied: lang === "fr" ? "Copié !" : "Copied!",
    friends: lang === "fr" ? "ami(s) parrainé(s)" : "friend(s) referred",
    bonus: lang === "fr" ? "alerte(s) bonus débloquée(s)" : "bonus alert(s) unlocked",
    whatsapp: lang === "fr" ? "Partager sur WhatsApp" : "Share on WhatsApp",
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-lg">
          <GiftIcon />
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

      {/* WhatsApp share */}
      <button
        onClick={shareWhatsApp}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors"
      >
        <PhoneIcon />
        {t.whatsapp}
      </button>
    </div>
  );
}

function GiftIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M4 10h16v10H4V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3.5 7h17v3h-17V7ZM12 7v13" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 7S8.7 3.5 6.8 5.4C5 7.2 8.3 8.3 12 7ZM12 7s3.3-3.5 5.2-1.6C19 7.2 15.7 8.3 12 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M8 3.5h8A1.5 1.5 0 0 1 17.5 5v14A1.5 1.5 0 0 1 16 20.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.5 17.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
