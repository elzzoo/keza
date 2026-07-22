"use client";
import { useState } from "react";
import { toast } from "sonner";
import type { MilesAlert } from "@/lib/miles-alerts";

export function MilesAlertsClient() {
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState<MilesAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // The manage token is only ever stored on the device/browser that created
  // the alert (see components/MilesAlertModal.tsx) — there's no email-based
  // recovery yet. Searching by email alone is no longer enough to view
  // someone else's alerts; see app/api/miles-alerts/route.ts.
  const getStoredToken = (forEmail: string) =>
    typeof window !== "undefined"
      ? localStorage.getItem(`keza:miles-alerts:token:${forEmail.toLowerCase().trim()}`)
      : null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Enter your email");
      return;
    }

    const token = getStoredToken(email);
    if (!token) {
      toast.error("No alerts found on this device for that email. Alerts can only be managed from the device where they were created.");
      setAlerts([]);
      setSearched(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/miles-alerts?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAlerts(data.alerts || []);
      setSearched(true);
    } catch {
      toast.error("Error loading alerts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email: string, route: string, program: string) => {
    if (!confirm("Delete this alert?")) return;

    const token = getStoredToken(email);
    if (!token) {
      toast.error("Missing manage token for this alert");
      return;
    }

    try {
      // Construct the Redis key format: keza:miles-alert:email:route:program
      const alertKey = `keza:miles-alert:${email}:${route}:${program}`;
      const res = await fetch("/api/miles-alerts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alertId: alertKey }),
      });

      if (!res.ok) throw new Error("Failed to delete");
      setAlerts(alerts.filter((a) => !(a.email === email && a.route === route && a.program === program)));
      toast.success("Alert deleted");
    } catch {
      toast.error("Error deleting alert");
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-4 py-2 bg-bg border border-border rounded-xl text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
      </form>

      {/* Results */}
      {searched && alerts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted">No alerts found for this email.</p>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-fg">Your Alerts ({alerts.length})</h2>
          {alerts.map((alert) => (
            <div
              key={`${alert.email}:${alert.route}:${alert.program}`}
              className="bg-surface border border-border rounded-xl p-4 flex items-start justify-between"
            >
              <div>
                <p className="font-semibold text-fg">{alert.route}</p>
                <p className="text-sm text-muted">{alert.program}</p>
                <p className="text-sm text-primary mt-2">
                  Alert when CPP ≤ {alert.thresholdCpp.toFixed(2)}¢
                </p>
                <p className="text-xs text-muted/60 mt-1">
                  Created {new Date(alert.createdAt * 1000).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(alert.email, alert.route, alert.program)}
                className="px-3 py-1 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
