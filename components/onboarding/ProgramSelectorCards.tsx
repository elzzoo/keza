"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/contexts/onboardingContext";
import { GLOBAL_PROGRAMS, type Alliance } from "@/lib/globalPrograms";

interface Props {
  onNext: () => void;
}

const DEFAULT_PROGRAMS = [
  "United MileagePlus",
  "AAdvantage",
  "Delta SkyMiles",
  "Alaska Mileage Plan",
  "Singapore KrisFlyer",
];

/**
 * ProgramSelectorCards: Grid-based loyalty program selector component.
 *
 * Displays programs organized by alliance with toggle card interface.
 * Selected programs are persisted to onboarding context.
 *
 * Features:
 * - Card-based grid layout
 * - Visual feedback for selected programs
 * - Grouped by alliance (Star Alliance, SkyTeam, Oneworld, Independent)
 * - Airline code and program name display
 */
export function ProgramSelectorCards({ onNext }: Props) {
  const { state, addProgram, removeProgram, setPrograms } = useOnboarding();

  useEffect(() => {
    // If no programs are selected, set the defaults
    // This handles fresh onboarding sessions
    if (state.selectedPrograms.length === 0) {
      const validDefaults = DEFAULT_PROGRAMS.filter(
        (name) => GLOBAL_PROGRAMS.some((p) => p.name === name)
      );
      setPrograms(validDefaults);
    }
  }, [state.selectedPrograms.length, setPrograms]);

  const handleToggle = (programName: string) => {
    if (state.selectedPrograms.includes(programName)) {
      removeProgram(programName);
    } else {
      addProgram(programName);
    }
  };

  // Group programs by alliance
  const programsByAlliance: Record<Alliance, typeof GLOBAL_PROGRAMS> = {
    "Star Alliance": [],
    SkyTeam: [],
    Oneworld: [],
    Independent: [],
  };

  GLOBAL_PROGRAMS.forEach((program) => {
    programsByAlliance[program.alliance].push(program);
  });

  const allianceOrder: Alliance[] = [
    "Star Alliance",
    "SkyTeam",
    "Oneworld",
    "Independent",
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Select Your Loyalty Programs</h2>
      <p className="text-gray-600 mb-8">
        Choose the programs you&apos;re a member of. We&apos;ll show you the best value for each flight.
      </p>

      <div className="space-y-8">
        {allianceOrder.map((alliance) => (
          <div key={alliance}>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              {alliance}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {programsByAlliance[alliance].map((program, index) => {
                const isSelected = state.selectedPrograms.includes(program.name);
                return (
                  <button
                    key={`${alliance}-${program.airlineCode}-${index}`}
                    onClick={() => handleToggle(program.name)}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {/* Airline Code Badge */}
                    <div
                      className={`text-sm font-bold mb-2 px-2 py-1 rounded ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {program.airlineCode}
                    </div>

                    {/* Program Name */}
                    <div
                      className={`text-xs text-center font-medium mb-3 ${
                        isSelected ? "text-gray-900" : "text-gray-700"
                      }`}
                    >
                      {program.name}
                    </div>

                    {/* Checkmark */}
                    {isSelected && (
                      <div className="text-xl text-blue-500">✓</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Next Button */}
      <div className="flex gap-3 mt-12">
        <button
          onClick={onNext}
          className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
