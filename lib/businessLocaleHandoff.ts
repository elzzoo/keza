export interface BusinessContactDraft {
  name: string;
  company: string;
  email: string;
  teamSize: string;
  message: string;
}

export interface BusinessContactSnapshot {
  draft: BusinessContactDraft;
  status: "idle" | "sending" | "done" | "error";
}

let pending: { target: "fr" | "en"; at: number; snapshot: BusinessContactSnapshot } | null = null;

export function saveBusinessLocaleHandoff(target: "fr" | "en", snapshot: BusinessContactSnapshot): void {
  pending = { target, at: Date.now(), snapshot };
}

export function readBusinessLocaleHandoff(target: "fr" | "en"): BusinessContactSnapshot | null {
  if (typeof window === "undefined") return null;
  const entry = pending;
  if (!entry || entry.target !== target || Date.now() - entry.at > 30_000) return null;
  return entry.snapshot;
}

export function clearBusinessLocaleHandoff(): void {
  pending = null;
}
