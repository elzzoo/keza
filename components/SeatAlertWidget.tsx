"use client";

import { useEffect, useState } from "react";
import { SeatAlertSubscription } from "@/lib/seatAlerts";

export function SeatAlertWidget() {
  const [alerts, setAlerts] = useState<SeatAlertSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/alerts/seat/my");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const handleDelete = async (alert: SeatAlertSubscription) => {
    if (!confirm(`Delete alert for ${alert.route}?`)) return;

    try {
      const res = await fetch("/api/alerts/seat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: alert.route,
          cabin: alert.cabin,
        }),
      });

      if (res.ok) {
        setAlerts(alerts.filter((a) => !(a.route === alert.route && a.cabin === alert.cabin)));
      }
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  if (loading) return <div className="p-4">Loading alerts...</div>;

  if (alerts.length === 0) {
    return <div className="p-4 text-gray-600">No seat preference alerts yet.</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-lg">Active Seat Alerts</h3>
      {alerts.map((alert) => (
        <div
          key={`${alert.route}-${alert.cabin}`}
          className="p-3 bg-blue-50 rounded border border-blue-200"
        >
          <div className="flex justify-between">
            <div>
              <p className="font-medium">{alert.route}</p>
              <p className="text-sm text-gray-600">
                {alert.cabin} • Max ${alert.minPrice}
              </p>
            </div>
            <button
              onClick={() => handleDelete(alert)}
              className="text-red-600 text-sm hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
