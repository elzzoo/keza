"use client";

import { useOnboarding } from "@/lib/contexts/onboardingContext";
import { useState, useEffect } from "react";

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export function BalanceSliders({ onNext, onSkip }: Props) {
  const { state, setBalance } = useOnboarding();
  const [localBalances, setLocalBalances] = useState<Record<string, number>>({});

  // Initialize local balances from context or defaults
  useEffect(() => {
    const balances: Record<string, number> = {};
    state.selectedPrograms.forEach((program) => {
      balances[program] = state.programBalances[program] ?? 250000; // Default 50% of 500k
    });
    setLocalBalances(balances);
  }, [state.selectedPrograms, state.programBalances]);

  const handleSliderChange = (program: string, value: number) => {
    setLocalBalances((prev) => ({
      ...prev,
      [program]: value,
    }));
  };

  const handleNext = () => {
    // Persist all balances to context
    Object.entries(localBalances).forEach(([program, balance]) => {
      setBalance(program, balance);
    });
    onNext();
  };

  const formatBalance = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Your Loyalty Program Balances</h2>
      <p className="text-gray-600 mb-6">
        Estimate your current miles/points balance. This helps us personalize recommendations.
      </p>

      <div className="space-y-6">
        {state.selectedPrograms.map((program) => (
          <div key={program}>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-900">{program}</label>
              <span className="text-sm font-mono text-blue-600">
                {formatBalance(localBalances[program] || 0)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="500000"
              step="10000"
              value={localBalances[program] || 250000}
              onChange={(e) => handleSliderChange(program, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>500K</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onSkip}
          className="flex-1 text-gray-700 font-semibold py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
