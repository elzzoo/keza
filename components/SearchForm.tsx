"use client";

import { useState } from "react";
import type { FlightResult } from "@/lib/engine";
import clsx from "clsx";

interface SearchFormProps {
  onResults: (results: FlightResult[]) => void;
  onLoading: (loading: boolean) => void;
}

export function SearchForm({ onResults, onLoading }: SearchFormProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [programs, setPrograms] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    onLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from.trim().toUpperCase(),
          to: to.trim().toUpperCase(),
          date: date,
          userPrograms: programs
            ? programs.split(",").map((p) => p.trim()).filter(Boolean)
            : [],
        }),
      });

      const json = await res.json() as { results: FlightResult[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      onResults(json.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      onResults([]);
    } finally {
      onLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted uppercase tracking-wider">
            From
          </label>
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="DKR"
            maxLength={3}
            required
            className={clsx(
              "w-full bg-card border border-border rounded-lg px-4 py-3",
              "text-white placeholder-muted text-sm font-mono uppercase",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
              "transition-all duration-200"
            )}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted uppercase tracking-wider">
            To
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="CDG"
            maxLength={3}
            required
            className={clsx(
              "w-full bg-card border border-border rounded-lg px-4 py-3",
              "text-white placeholder-muted text-sm font-mono uppercase",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
              "transition-all duration-200"
            )}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted uppercase tracking-wider">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={clsx(
              "w-full bg-card border border-border rounded-lg px-4 py-3",
              "text-white placeholder-muted text-sm",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
              "transition-all duration-200",
              "[color-scheme:dark]"
            )}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted uppercase tracking-wider">
          Your Miles Programs{" "}
          <span className="normal-case text-muted/60">(optional, comma-separated)</span>
        </label>
        <input
          type="text"
          value={programs}
          onChange={(e) => setPrograms(e.target.value)}
          placeholder="Air France, Amex MR, Chase UR"
          className={clsx(
            "w-full bg-card border border-border rounded-lg px-4 py-3",
            "text-white placeholder-muted text-sm",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
            "transition-all duration-200"
          )}
        />
      </div>

      {error && (
        <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        className={clsx(
          "w-full bg-accent hover:bg-accent-dim text-white font-semibold",
          "rounded-lg px-6 py-3 text-sm transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface",
          "active:scale-[0.98]"
        )}
      >
        Find Best Option →
      </button>
    </form>
  );
}
