"use client";

import { useState, useEffect } from "react";

type PushState = "unsupported" | "idle" | "loading" | "subscribed" | "denied";

interface Props {
  lang?: string;
  email?: string;
  token?: string;
}

interface InnerProps {
  lang: string;
  email: string;
  token: string;
}

function storageKey(email: string): string {
  return "keza:push:status:" + email.toLowerCase();
}

function PushAlertButtonInner({ lang, email, token }: InnerProps) {
  const [state, setState] = useState<PushState>("unsupported");
  const fr = lang !== "en";

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
      if (localStorage.getItem(storageKey(email)) === "1") {
        // Verify the browser still has an active push subscription
        navigator.serviceWorker.ready
          .then((reg) => reg.pushManager.getSubscription())
          .then((sub) => {
            if (sub) {
              setState("subscribed");
            } else {
              // Browser sub gone, reset
              try { localStorage.removeItem(storageKey(email)); } catch { /* ignore */ }
              setState("idle");
            }
          })
          .catch(() => {
            setState("idle");
          });
        return;
      }
    } catch {
      // localStorage unavailable
    }
    setState("idle");
  }, [email, token]);

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
          subscription: {
            endpoint: sub.endpoint,
            keys: {
              p256dh: json.keys?.p256dh ?? "",
              auth: json.keys?.auth ?? "",
            },
          },
          email,
          token,
        }),
      });

      if (res.ok || res.status === 201) {
        try {
          localStorage.setItem(storageKey(email), "1");
        } catch {
          // localStorage unavailable
        }
        setState("subscribed");
      } else {
        setState("idle");
      }
    } catch (err) {
      console.error("[PushAlertButton] subscription failed:", err);
      setState("idle");
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch(
          `/api/push/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&endpoint=${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE" }
        );
      }
    } catch (err) {
      console.error("[PushAlertButton] unsubscribe failed:", err);
    } finally {
      try {
        localStorage.removeItem(storageKey(email));
      } catch {
        // localStorage unavailable
      }
      setState("idle");
    }
  }

  if (state === "unsupported") return null;

  if (state === "denied") {
    return (
      <p className="text-xs text-muted mt-3">
        {fr
          ? "Permission refusée — activez-la dans les réglages de votre navigateur"
          : "Permission denied — enable it in your browser settings"}
      </p>
    );
  }

  if (state === "subscribed") {
    return (
      <div className="flex items-center gap-3 mt-3">
        <span className="text-sm text-green-500">
          ✓ {fr ? "Notifications activées" : "Notifications enabled"}
        </span>
        <button
          onClick={unsubscribe}
          className="text-xs text-muted hover:text-red-400 transition-colors underline"
        >
          {fr ? "Désactiver" : "Disable"}
        </button>
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
          : fr ? "Activer les notifications" : "Enable notifications"}
      </span>
    </button>
  );
}

export function PushAlertButton({ lang = "fr", email, token }: Props) {
  if (!email || !token) return null;
  return <PushAlertButtonInner lang={lang} email={email} token={token} />;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // atob throws on invalid base64 — caller's try/catch handles it
  return Uint8Array.from(Array.from(rawData, (c) => c.charCodeAt(0)));
}
