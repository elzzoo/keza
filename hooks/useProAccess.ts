"use client";

/**
 * React hook for checking Pro access on the client side
 * Fetches from /api/pro/access endpoint
 */

import { useEffect, useState } from "react";
import type { ProAccessStatus } from "@/lib/proAccess";

export function useProAccess() {
  const [status, setStatus] = useState<ProAccessStatus>({ isPro: false, hasTrial: false, daysLeft: null, isActive: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/pro/access");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ProAccessStatus;
        setStatus(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus({ isPro: false, hasTrial: false, daysLeft: null, isActive: false });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { ...status, loading, error };
}
