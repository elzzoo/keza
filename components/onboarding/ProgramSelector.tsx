"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/contexts/onboardingContext";

interface Props {
  onNext: () => void;
}

const PROGRAMS_BY_CATEGORY: Record<string, string[]> = {
  "Star Alliance": [
    "United MileagePlus",
    "Singapore KrisFlyer",
    "ANA Mileage Club",
    "Lufthansa Miles & More",
    "Turkish Miles&Smiles",
    "Air Canada Aeroplan",
    "Ethiopian Airlines ShebaMiles",
    "COPA ConnectMiles",
    "Avianca LifeMiles",
    "Thai Royal Orchid Plus",
  ],
  "SkyTeam": [
    "Flying Blue",
    "Delta SkyMiles",
    "Korean Air SKYPASS",
    "Kenya Airways Mileage Club",
  ],
  "Oneworld": [
    "American AAdvantage",
    "British Airways Executive Club",
    "Qatar Privilege Club",
    "LATAM Pass",
    "Japan Airlines Mileage Bank",
    "Iberia Avios Plus",
    "Qantas Frequent Flyer",
    "Air New Zealand Airpoints",
    "Finnair Plus",
  ],
  "Independent": [
    "Emirates Skywards",
    "Etihad Guest",
    "Virgin Atlantic Flying Club",
    "Alaska Airlines Mileage Plan",
  ],
};

const DEFAULT_PROGRAMS = [
  "United MileagePlus",
  "American AAdvantage",
  "Delta SkyMiles",
  "Alaska Airlines Mileage Plan",
  "Singapore KrisFlyer",
];

export function ProgramSelector({ onNext }: Props) {
  const { state, addProgram, removeProgram, setPrograms } = useOnboarding();

  // Initialize with default programs on first load
  useEffect(() => {
    // If no programs are selected, set the defaults
    // This handles fresh onboarding sessions
    if (state.selectedPrograms.length === 0) {
      setPrograms(DEFAULT_PROGRAMS);
    }
  }, [state.selectedPrograms.length, setPrograms]);

  const handleToggle = (program: string) => {
    if (state.selectedPrograms.includes(program)) {
      removeProgram(program);
    } else {
      addProgram(program);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Select Your Loyalty Programs</h2>
      <p className="text-gray-600 mb-6">
        Choose the programs you're a member of. We'll show you the best value for each flight.
      </p>

      <div className="space-y-6">
        {Object.entries(PROGRAMS_BY_CATEGORY).map(([category, programs]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {programs.map((program) => (
                <label
                  key={program}
                  className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={state.selectedPrograms.includes(program)}
                    onChange={() => handleToggle(program)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">{program}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onNext}
          className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
