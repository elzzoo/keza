"use client";

import { useState } from "react";
import { CabinType } from "@/lib/seatAlerts";

export interface SeatAlertFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const CABINS: { label: string; value: CabinType }[] = [
  { label: "Economy", value: "ECONOMY" },
  { label: "Premium Economy", value: "PREMIUM_ECONOMY" },
  { label: "Business Class", value: "BUSINESS" },
  { label: "First Class", value: "FIRST" },
];

export function SeatAlertForm({ onSuccess, onError }: SeatAlertFormProps) {
  const [route, setRoute] = useState("");
  const [cabin, setCabin] = useState<CabinType>("BUSINESS");
  const [minPrice, setMinPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/alerts/seat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: route.toUpperCase(),
          cabin,
          minPrice: parseInt(minPrice, 10),
        }),
      });

      if (!res.ok) throw new Error("Failed to save alert");

      setRoute("");
      setMinPrice("");
      onSuccess?.();
    } catch (err) {
      onError?.(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg border">
      <h3 className="font-bold text-lg">Create Seat Preference Alert</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Route (e.g., SIN-LAX)</label>
        <input
          type="text"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          placeholder="SIN-LAX"
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Cabin Class</label>
        <select
          value={cabin}
          onChange={(e) => setCabin(e.target.value as CabinType)}
          className="w-full px-3 py-2 border rounded"
        >
          {CABINS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Max Price (USD)</label>
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="5000"
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Alert"}
      </button>
    </form>
  );
}
