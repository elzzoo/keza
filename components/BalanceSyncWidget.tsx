"use client";

import { useState, useEffect } from "react";

export interface BalanceSyncWidgetProps {
  lastSync: Date | null;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
  isAvailable?: boolean;
  lang?: "fr" | "en";
}

export function BalanceSyncWidget({
  lastSync,
  onRefresh,
  isLoading = false,
  isAvailable = true,
  lang = "en",
}: BalanceSyncWidgetProps) {
  const [loading, setLoading] = useState(isLoading);
  const [error, setError] = useState<string | null>(null);

  // Sync loading prop with internal state
  useEffect(() => {
    setLoading(isLoading ?? false);
  }, [isLoading]);

  const handleRefresh = async () => {
    if (!isAvailable) return;
    setLoading(true);
    setError(null);
    try {
      await onRefresh?.();
    } catch (err) {
      console.error("Refresh failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh balances";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date | null): string => {
    if (!date) return "Never";
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  const isStale = lastSync && (Date.now() - lastSync.getTime()) > 24 * 60 * 60 * 1000;
  const t = lang === "fr"
    ? {
        title: "Saisie manuelle active",
        lastSynced: "Derniere synchronisation",
        never: "Jamais",
        unavailable:
          "La synchronisation automatique des comptes compagnies n'est pas encore active. Entrez vos soldes manuellement.",
        stale: "Les donnees synchronisees sont anciennes. Actualisez pour recuperer les valeurs recentes.",
        refresh: "Actualiser",
        refreshing: "Actualisation...",
      }
    : {
        title: "Manual entry mode",
        lastSynced: "Last synced",
        never: "Never",
        unavailable:
          "Automatic airline account sync is not live yet. Enter your balances manually.",
        stale: "Balance data is stale. Please refresh for current values.",
        refresh: "Refresh Now",
        refreshing: "Refreshing...",
      };

  const displayLastSync = lastSync ? getTimeAgo(lastSync) : t.never;

  return (
    <div className={`p-4 rounded-lg border ${!isAvailable ? "bg-surface border-border" : error ? "bg-red-50 border-red-300" : isStale ? "bg-yellow-50 border-yellow-300" : "bg-green-50 border-green-300"}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className={`text-sm font-medium ${!isAvailable ? "text-fg" : ""}`}>
            {isAvailable ? "Balance Sync Status" : t.title}
          </p>
          <p className={`text-sm ${!isAvailable ? "text-muted" : "text-gray-600"}`}>
            {t.lastSynced}: {displayLastSync}
          </p>
          {!isAvailable && (
            <p className="text-xs text-muted mt-1 max-w-md">
              {t.unavailable}
            </p>
          )}
          {error && (
            <p className="text-xs text-red-700 mt-1">
              ⚠️ {error}
            </p>
          )}
          {isAvailable && !error && isStale && (
            <p className="text-xs text-yellow-700 mt-1">
              ⚠️ {t.stale}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Refresh balance sync"
          onClick={handleRefresh}
          disabled={loading || !isAvailable}
          className={`px-4 py-2 rounded font-medium transition ${
            loading || !isAvailable
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading ? t.refreshing : t.refresh}
        </button>
      </div>
    </div>
  );
}
