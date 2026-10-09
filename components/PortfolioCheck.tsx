"use client";

import type { MilesOption } from "@/lib/costEngine";
import { checkPortfolio } from "@/lib/portfolioEngine";
import { useProfile } from "@/hooks/useProfile";

interface PortfolioCheckProps {
  milesOptions: MilesOption[];
  lang: "fr" | "en";
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

function StatusIcon({ tone, className = "h-4 w-4" }: { tone: "success" | "info" | "warning"; className?: string }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
        <path d="m5 12.5 4.2 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (tone === "info") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
        <path d="M7 7h8a4 4 0 0 1 0 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9 11-3 4 3 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M12 4 3.8 18.5h16.4L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4M12 16.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function PortfolioCheck({ milesOptions, lang }: PortfolioCheckProps) {
  const { profile } = useProfile();

  // Don't render during SSR or if no profile loaded yet
  if (!profile) return null;

  const status = checkPortfolio(milesOptions, profile.balances, profile.bankPoints);

  // Only show portfolio status if user has entered balances for at least one program
  const userHasBalances = Object.keys(profile.balances ?? {}).length > 0 && Object.values(profile.balances ?? {}).some(v => v > 0);

  if (status.type === "CAN_AFFORD") {
    const message =
      lang === "fr"
        ? `Tu peux payer avec tes ${fmt(status.milesNeeded)} ${status.program} — il te restera ${fmt(status.balanceAfter)} miles`
        : `You can pay with your ${fmt(status.milesNeeded)} ${status.program} — ${fmt(status.balanceAfter)} miles remaining`;

    return (
      <div className="flex items-start gap-2 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm mb-4 text-green-400">
        <StatusIcon tone="success" className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  if (status.type === "CAN_TRANSFER") {
    const message =
      lang === "fr"
        ? `Il te manque ${fmt(status.shortfall)} miles — transfère ${fmt(status.transferAmount)} ${status.transferFrom} → ${status.program}`
        : `You're short ${fmt(status.shortfall)} miles — transfer ${fmt(status.transferAmount)} ${status.transferFrom} → ${status.program}`;

    return (
      <div className="flex items-start gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-sm mb-4 text-blue-400">
        <StatusIcon tone="info" className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  if (status.type === "CANT_AFFORD" && userHasBalances) {
    // Only show the shortfall warning if user has actually entered balances for this program
    const programHasBalance = (profile.balances?.[status.bestProgram] ?? 0) > 0 || (profile.bankPoints && Object.values(profile.bankPoints).some(v => v > 0));

    if (programHasBalance || profile.balances?.[status.bestProgram] === 0) {
      // Show "You have X miles, you're short Y" format instead of just shortfall
      const userBalance = profile.balances?.[status.bestProgram] ?? 0;
      const message =
        lang === "fr"
          ? `Vous avez ${fmt(userBalance)} miles ${status.bestProgram}, il vous en manque ${fmt(status.shortfall)}`
          : `You have ${fmt(userBalance)} ${status.bestProgram} miles, you need ${fmt(status.shortfall)} more`;

      return (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm mb-4 text-amber-400">
          <StatusIcon tone="warning" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      );
    }
  }

  // NO_PORTFOLIO or user hasn't set balances
  const message =
    lang === "fr"
      ? "Ajoute tes soldes miles pour savoir si tu peux te payer ce vol →"
      : "Add your miles balances to see if you can afford this flight →";

  return (
    <div
      className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm mb-4 text-white/50 cursor-pointer hover:text-white/70"
      onClick={() =>
        document
          .querySelector("[data-programs-widget]")
          ?.scrollIntoView({ behavior: "smooth" })
      }
    >
      <StatusIcon tone="info" className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
