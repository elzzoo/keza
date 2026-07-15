"use client";

import type { MilesOption } from "@/lib/costEngine";
import { checkPortfolio } from "@/lib/portfolioEngine";
import { useProfile } from "@/hooks/useProfile";

interface PortfolioCheckProps {
  milesOptions: MilesOption[];
  lang: "fr" | "en";
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

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
        ? `✅ Tu peux payer avec tes ${fmt(status.milesNeeded)} ${status.program} — il te restera ${fmt(status.balanceAfter)} miles`
        : `✅ You can pay with your ${fmt(status.milesNeeded)} ${status.program} — ${fmt(status.balanceAfter)} miles remaining`;

    return (
      <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm mb-4 text-green-400">
        {message}
      </div>
    );
  }

  if (status.type === "CAN_TRANSFER") {
    const message =
      lang === "fr"
        ? `🔁 Il te manque ${fmt(status.shortfall)} miles — transfère ${fmt(status.transferAmount)} ${status.transferFrom} → ${status.program}`
        : `🔁 You're short ${fmt(status.shortfall)} miles — transfer ${fmt(status.transferAmount)} ${status.transferFrom} → ${status.program}`;

    return (
      <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-sm mb-4 text-blue-400">
        {message}
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
          ? `⚠️ Vous avez ${fmt(userBalance)} miles ${status.bestProgram}, il vous en manque ${fmt(status.shortfall)}`
          : `⚠️ You have ${fmt(userBalance)} ${status.bestProgram} miles, you need ${fmt(status.shortfall)} more`;

      return (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm mb-4 text-amber-400">
          {message}
        </div>
      );
    }
  }

  // NO_PORTFOLIO or user hasn't set balances
  const message =
    lang === "fr"
      ? "💡 Ajoute tes soldes miles pour savoir si tu peux te payer ce vol →"
      : "💡 Add your miles balances to see if you can afford this flight →";

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm mb-4 text-white/50 cursor-pointer hover:text-white/70"
      onClick={() =>
        document
          .querySelector("[data-programs-widget]")
          ?.scrollIntoView({ behavior: "smooth" })
      }
    >
      {message}
    </div>
  );
}
