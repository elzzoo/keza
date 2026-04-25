/**
 * KEZA Discord webhook notifications
 * Used for ops visibility: alert triggered, cron errors, etc.
 * Set DISCORD_WEBHOOK_URL in env to enable. Silently no-ops if unset.
 */

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number; // decimal integer
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string; // ISO 8601
}

/**
 * Send a Discord webhook message. Fire-and-forget — never await in hot paths.
 * Silently returns if DISCORD_WEBHOOK_URL is not configured.
 */
export async function sendDiscordAlert(
  content: string,
  embeds?: DiscordEmbed[]
): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        embeds: embeds ?? [],
      }),
    });
  } catch {
    // Never crash the app because of Discord
  }
}

// ── Pre-built notification helpers ───────────────────────────────────────────

/** Fires when a price alert is triggered and email was sent. */
export function notifyAlertTriggered(params: {
  from: string;
  to: string;
  cabin: string;
  adjustedPrice: number;
  targetPrice: number;
  email: string;
}): Promise<void> {
  const { from, to, cabin, adjustedPrice, targetPrice, email } = params;
  const savings = targetPrice - adjustedPrice;
  const cabinLabel =
    cabin === "business" ? "Business"
    : cabin === "first" ? "First"
    : cabin === "premium" ? "Premium Eco"
    : "Economy";

  return sendDiscordAlert("", [
    {
      title: `✈ Prix atteint — ${from} → ${to}`,
      description: `**${email}** vient de recevoir une notification de baisse de prix.`,
      color: 0x3b82f6, // blue-500
      fields: [
        { name: "Route", value: `${from} → ${to}`, inline: true },
        { name: "Cabin", value: cabinLabel, inline: true },
        { name: "Prix actuel", value: `$${adjustedPrice}`, inline: true },
        { name: "Cible", value: `$${targetPrice}`, inline: true },
        { name: "Économie", value: `$${savings}`, inline: true },
      ],
      footer: { text: "KEZA cron/alerts" },
      timestamp: new Date().toISOString(),
    },
  ]);
}

/** Fires at the end of each cron run with a summary. */
export function notifyCronSummary(params: {
  routes: number;
  checked: number;
  notified: number;
  errors: string[];
}): Promise<void> {
  const { routes, checked, notified, errors } = params;
  const hasErrors = errors.length > 0;
  const color = hasErrors ? 0xf59e0b : notified > 0 ? 0x22c55e : 0x6b7280;
  const title = hasErrors
    ? `⚠️ Cron terminé avec ${errors.length} erreur(s)`
    : notified > 0
    ? `✅ Cron terminé — ${notified} notification(s) envoyée(s)`
    : `⏱ Cron terminé — aucune alerte déclenchée`;

  const fields: DiscordEmbed["fields"] = [
    { name: "Routes vérifiées", value: String(routes), inline: true },
    { name: "Alertes vérifiées", value: String(checked), inline: true },
    { name: "Notifications", value: String(notified), inline: true },
  ];

  if (hasErrors) {
    fields.push({
      name: "Erreurs",
      value: errors.slice(0, 5).join("\n"),
      inline: false,
    });
  }

  return sendDiscordAlert("", [
    {
      title,
      color,
      fields,
      footer: { text: "KEZA cron/alerts" },
      timestamp: new Date().toISOString(),
    },
  ]);
}
