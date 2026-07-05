"use client";
import { useState } from "react";
import { toast } from "sonner";
import type { MilesAlert } from "@/lib/miles-alerts";

export function MilesAlertsClient() {
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState<MilesAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Enter your email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/miles-alerts?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAlerts(data.alerts || []);
      setSearched(true);
    } catch (err) {
      toast.error("Error loading alerts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email: string, route: string, program: string) => {
    if (!confirm("Delete this alert?")) return;

    try {
      // Construct the Redis key format: keza:miles-alert:email:route:program
      const alertKey = `keza:miles-alert:${email}:${route}:${program}`;
      const res = await fetch("/api/miles-alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alertKey }),
      });

      if (!res.ok) throw new Error("Failed to delete");
      setAlerts(alerts.filter((a) => !(a.email === email && a.route === route && a.program === program)));
      toast.success("Alert deleted");
    } catch (err) {
      toast.error("Error deleting alert");
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-gray-50 p-6 rounded-lg">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
      </form>

      {/* Results */}
      {searched && alerts.length === 0 && (
        <p className="text-gray-600 text-center">No alerts found for this email.</p>
      )}

      {alerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Your Alerts ({alerts.length})</h2>
          {alerts.map((alert) => (
            <div
              key={`${alert.email}:${alert.route}:${alert.program}`}
              className="border rounded-lg p-4 flex items-start justify-between"
            >
              <div>
                <p className="font-medium">{alert.route}</p>
                <p className="text-sm text-gray-600">{alert.program}</p>
                <p className="text-sm text-blue-600 mt-2">
                  Alert when CPP ≤ {alert.thresholdCpp.toFixed(2)}¢
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Created {new Date(alert.createdAt * 1000).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(alert.email, alert.route, alert.program)}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
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
