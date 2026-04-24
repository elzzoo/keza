"use client";

import { useState, useEffect } from "react";

type PushState = "unsupported" | "default" | "loading" | "subscribed" | "denied";

interface Props {
  lang?: string;
}

const STORAGE_KEY = "keza:push:subscribed";

export function PushAlertButton({ lang = "fr" }: Props) {
  const [state, setState] = useState<PushState>("unsupported");
  const fr = lang !== "en";

  // Detect browser support and read existing subscription state
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") {
      setState("denied");
      return;
    }
    // Check localStorage for persisted subscription
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setState("subscribed");
        return;
      }
    } catch {
      // localStorage unavailable
    }
    setState("default");
  }, []);

  async function subscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("[PushAlertButton] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      return;
    }

    setState("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: json.keys?.p256dh ?? "",
            auth: json.keys?.auth ?? "",
          },
        }),
      });

      if (res.ok || res.status === 201) {
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          // localStorage unavailable
        }
        setState("subscribed");
      } else {
        setState("default");
      }
    } catch (err) {
      console.error("[PushAlertButton] subscription failed:", err);
      setState("default");
    }
  }

  if (state === "unsupported") return null;

  if (state === "denied") {
    return (
      <p className="text-xs text-muted mt-3">
        {fr
          ? "🔕 Les notifications push sont bloquées dans ce navigateur."
          : "🔕 Push notifications are blocked in this browser."}
      </p>
    );
  }

  if (state === "subscribed") {
    return (
      <div className="flex items-center gap-2 mt-3 text-sm text-green-500">
        <span>🔔</span>
        <span>
          {fr ? "Alertes push activées" : "Push alerts enabled"}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={state === "loading"}
      className="mt-3 flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border text-fg hover:bg-surface-hover transition-colors disabled:opacity-50"
    >
      <span>🔔</span>
      <span>
        {state === "loading"
          ? fr ? "Activation…" : "Enabling…"
          : fr ? "Activer les alertes push" : "Enable push alerts"}
      </span>
    </button>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // atob throws on invalid base64 — caller's try/catch handles it
  return Uint8Array.from(Array.from(rawData, (c) => c.charCodeAt(0)));
}
