"use client";

import { useState } from "react";
import { ProgramSelector } from "./ProgramSelector";
import { BalanceSliders } from "./BalanceSliders";
import { FavoriteRoutes } from "./FavoriteRoutes";
import { setVisitedFlag } from "@/lib/storage";

interface Props {
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(1);

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as Step);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleSkip = () => {
    if (step < 3) {
      setStep(3);
    }
  };

  const handleComplete = () => {
    setVisitedFlag(true);
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Welcome to KEZA</h1>
            <span className="text-sm font-semibold text-gray-600">
              Step {step} of 3
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          {step === 1 && <ProgramSelector onNext={handleNext} />}
          {step === 2 && <BalanceSliders onNext={handleNext} onSkip={handleSkip} />}
          {step === 3 && <FavoriteRoutes onNext={handleComplete} onSkip={handleSkip} />}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="px-6 py-2 text-gray-700 font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Back
            </button>
          )}
          <div className="flex-1" />
        </div>
      </div>
    </div>
  );
}
