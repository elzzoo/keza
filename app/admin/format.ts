import type { CronHealthStatus } from "@/lib/cronState";

export function cronHealthLabel(health: CronHealthStatus): string {
  const labels: Record<CronHealthStatus, string> = {
    ok: "OK",
    running: "En cours",
    stale: "En retard",
    degraded: "Dégradé",
    unknown: "Inconnu",
  };
  return labels[health];
}

export function cronHealthColor(health: CronHealthStatus): "blue" | "green" | "amber" | "purple" {
  if (health === "ok") return "green";
  if (health === "running") return "blue";
  if (health === "unknown") return "purple";
  return "amber";
}

export function formatMismatchIds(ids: string[]): string {
  if (ids.length === 0) return "aucun";
  const visible = ids.slice(0, 5).join(", ");
  return ids.length > 5 ? `${visible} +${ids.length - 5}` : visible;
}

export function formatTtl(seconds: number): string {
  if (seconds <= 0) return "expiré";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `expire dans ${h}h ${m}m`;
  return `expire dans ${m}m`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "jamais";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "medium",
  });
}
