"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "keza_push_enabled";
const DISMISSED_KEY = "keza_push_dismissed";

// Read VAPID public key from env (set NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel).
// If not set, the banner will not appear.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotifBanner({ lang }: { lang: "fr" | "en" }) {
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Hide if VAPID key not configured
    if (!VAPID_PUBLIC_KEY) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted" && localStorage.getItem(STORAGE_KEY) === "true") return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    setVisible(true);
  }, []);

  const handleEnable = async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });

      // Send subscription to backend
      const raw = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: raw.endpoint,
          keys: {
            p256dh: raw.keys?.p256dh ?? "",
            auth: raw.keys?.auth ?? "",
          },
        }),
      });

      localStorage.setItem(STORAGE_KEY, "true");
      setVisible(false);
    } catch (err) {
      console.error("[KEZA] Push subscription failed:", err);
    } finally {
      setSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-3 animate-fade-up">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg">
          {lang === "fr"
            ? "Recevez des alertes de baisse de prix en temps réel"
            : "Get real-time price drop alerts"}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {lang === "fr"
            ? "Soyez notifié quand un vol que vous suivez baisse de prix."
            : "Get notified when a flight you track drops in price."}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleEnable}
          disabled={subscribing}
          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {subscribing
            ? "..."
            : lang === "fr"
              ? "Activer les notifications"
              : "Enable notifications"}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface transition-colors"
          aria-label={lang === "fr" ? "Fermer" : "Dismiss"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
