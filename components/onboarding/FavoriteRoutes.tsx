"use client";

import { useOnboarding } from "@/lib/contexts/onboardingContext";
import { useState } from "react";
import { parseRoute } from "./routeParser";

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

// Top 100 routes by approximate search volume
const TOP_ROUTES = [
  ["SIN", "LAX"],
  ["LAX", "SIN"],
  ["CDG", "JFK"],
  ["JFK", "CDG"],
  ["NRT", "LAX"],
  ["LAX", "NRT"],
  ["HND", "LAX"],
  ["LAX", "HND"],
  ["SFO", "NRT"],
  ["NRT", "SFO"],
  ["LHR", "JFK"],
  ["JFK", "LHR"],
  ["DXB", "LHR"],
  ["LHR", "DXB"],
  ["CDG", "SIN"],
  ["SIN", "CDG"],
  ["LAX", "ORD"],
  ["ORD", "LAX"],
  ["NRT", "JFK"],
  ["JFK", "NRT"],
  ["ICN", "LAX"],
  ["LAX", "ICN"],
  ["BKK", "LAX"],
  ["LAX", "BKK"],
  ["SYD", "LAX"],
  ["LAX", "SYD"],
  ["HND", "SFO"],
  ["SFO", "HND"],
  ["PEK", "LAX"],
  ["LAX", "PEK"],
  ["FRA", "JFK"],
  ["JFK", "FRA"],
  ["CDG", "LAX"],
  ["LAX", "CDG"],
  ["LAX", "SFO"],
  ["SFO", "LAX"],
  ["ORD", "JFK"],
  ["JFK", "ORD"],
  ["DXB", "JFK"],
  ["JFK", "DXB"],
  ["SIN", "JFK"],
  ["JFK", "SIN"],
  ["LHR", "LAX"],
  ["LAX", "LHR"],
  ["DXB", "CDG"],
  ["CDG", "DXB"],
  ["HND", "NRT"],
  ["NRT", "HND"],
  ["LAX", "AKL"],
  ["AKL", "LAX"],
  ["SYD", "SFO"],
  ["SFO", "SYD"],
  ["BKK", "JFK"],
  ["JFK", "BKK"],
  ["LAX", "TPE"],
  ["TPE", "LAX"],
  ["NRT", "SFO"],
  ["SFO", "NRT"],
  ["DXB", "SFO"],
  ["SFO", "DXB"],
  ["LAX", "MEL"],
  ["MEL", "LAX"],
  ["SIN", "SFO"],
  ["SFO", "SIN"],
  ["CDG", "FRA"],
  ["FRA", "CDG"],
  ["ICN", "SFO"],
  ["SFO", "ICN"],
  ["LAX", "AUS"],
  ["AUS", "LAX"],
  ["CDG", "BKK"],
  ["BKK", "CDG"],
  ["BKK", "SIN"],
  ["SIN", "BKK"],
  ["HND", "BKK"],
  ["BKK", "HND"],
  ["LAX", "HNL"],
  ["HNL", "LAX"],
  ["SFO", "DXB"],
  ["DXB", "SFO"],
  ["LHR", "DXB"],
  ["DXB", "LHR"],
  ["CDG", "JNB"],
  ["JNB", "CDG"],
  ["ORD", "SFO"],
  ["SFO", "ORD"],
  ["LHR", "SFO"],
  ["SFO", "LHR"],
  ["JFK", "SFO"],
  ["SFO", "JFK"],
  ["LAX", "JFK"],
  ["JFK", "LAX"],
  ["LHR", "ORD"],
  ["ORD", "LHR"],
  ["CDG", "ORD"],
  ["ORD", "CDG"],
];

export function FavoriteRoutes({ onNext, onSkip }: Props) {
  const { state, addRoute, removeRoute } = useOnboarding();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Array<[string, string]>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.length > 2) {
      const parsed = parseRoute(value);
      if (parsed) {
        const filtered = TOP_ROUTES.filter(
          ([from, to]) =>
            (from.includes(parsed.from.toUpperCase()) ||
              to.includes(parsed.to.toUpperCase()) ||
              from.toUpperCase().includes(parsed.from) ||
              to.toUpperCase().includes(parsed.to)) &&
            !state.favoriteRoutes.some((r) => r[0] === from && r[1] === to)
        );
        setSuggestions(filtered.slice(0, 5));
        setShowSuggestions(true);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddRoute = () => {
    const parsed = parseRoute(input);
    if (parsed) {
      addRoute(parsed.from, parsed.to);
      setInput("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (from: string, to: string) => {
    addRoute(from, to);
    setInput("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRemoveRoute = (from: string, to: string) => {
    removeRoute(from, to);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRoute();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Your Favorite Routes</h2>
      <p className="text-gray-600 mb-6">
        Add routes you search often. We'll pre-fill and show relevant deals.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">Add a Route</label>
        <div className="relative">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., SIN to LAX or SIN → LAX"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddRoute}
              disabled={state.favoriteRoutes.length >= 5}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition"
            >
              Add
            </button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {suggestions.map(([from, to]) => (
                <button
                  key={`${from}-${to}`}
                  onClick={() => handleSuggestionClick(from, to)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                >
                  {from} → {to}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-semibold block mb-3">
          Your Routes ({state.favoriteRoutes.length}/5)
        </label>
        <div className="space-y-2">
          {state.favoriteRoutes.map(([from, to]) => (
            <div
              key={`${from}-${to}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <span className="font-medium">
                {from} → {to}
              </span>
              <button
                onClick={() => handleRemoveRoute(from, to)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          {state.favoriteRoutes.length === 0 && (
            <p className="text-sm text-gray-500">No routes added yet</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 text-gray-700 font-semibold py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
        >
          Skip
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
