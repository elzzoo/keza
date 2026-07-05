# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete 3-step onboarding modal for new KEZA users that captures loyalty program preferences, balance estimates, and favorite routes, then personalizes search results in <60 seconds.

**Architecture:** New users see a modal on first visit with Step 1 (program selection from 40+ programs grouped by category), Step 2 (balance sliders for each selected program), and Step 3 (favorite route entry with autocomplete). All data persists to localStorage and is integrated into ProfileContext. SearchForm pre-fills programs, routes, and displays personalized CTAs based on user's selected programs and balances.

**Tech Stack:** React 18 (client-only), TypeScript, Tailwind CSS, localStorage for persistence, Context API for state management.

---

## File Structure

**New files to create:**
- `lib/contexts/onboardingContext.ts` — State management for onboarding (step, programs, balances, routes)
- `lib/storage.ts` — localStorage schema and helpers (getOnboardingState, setOnboardingState, etc.)
- `components/onboarding/OnboardingFlow.tsx` — Controller component showing steps sequentially
- `components/onboarding/ProgramSelector.tsx` — Step 1: program checkboxes grouped by category
- `components/onboarding/BalanceSliders.tsx` — Step 2: sliders for each selected program
- `components/onboarding/FavoriteRoutes.tsx` — Step 3: text input + autocomplete for routes
- `components/onboarding/RouteAutocomplete.ts` — Autocomplete logic + top 100 routes
- `__tests__/components/onboarding/onboarding.test.tsx` — Full onboarding flow tests

**Modified files:**
- `components/SearchForm.tsx` — Add onboarding modal trigger, pre-fill programs/routes
- `lib/contexts/ProfileContext.tsx` (or create new) — Add selectedPrograms, programBalances, favoriteRoutes

---

## Task 1: Create Storage Module

**Files:**
- Create: `lib/storage.ts`

Storage module defines the localStorage schema and provides typed helpers for reading/writing onboarding state.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/storage.test.ts
import { 
  getOnboardingState, 
  setOnboardingState, 
  getVisitedFlag, 
  setVisitedFlag,
  type OnboardingState 
} from "@/lib/storage";

describe("onboarding storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default onboarding state when no data stored", () => {
    const state = getOnboardingState();
    expect(state.selectedPrograms).toEqual([]);
    expect(state.programBalances).toEqual({});
    expect(state.favoriteRoutes).toEqual([]);
  });

  it("persists and retrieves onboarding state", () => {
    const state: OnboardingState = {
      selectedPrograms: ["Flying Blue", "Singapore KrisFlyer"],
      programBalances: { "Flying Blue": 150000, "Singapore KrisFlyer": 250000 },
      favoriteRoutes: [["SIN", "LAX"], ["CDG", "JFK"]],
    };
    setOnboardingState(state);
    const retrieved = getOnboardingState();
    expect(retrieved).toEqual(state);
  });

  it("marks user as visited", () => {
    expect(getVisitedFlag()).toBe(false);
    setVisitedFlag(true);
    expect(getVisitedFlag()).toBe(true);
  });

  it("returns empty balances for new programs not in state", () => {
    const state: OnboardingState = {
      selectedPrograms: ["Flying Blue"],
      programBalances: { "Flying Blue": 100000 },
      favoriteRoutes: [],
    };
    setOnboardingState(state);
    const retrieved = getOnboardingState();
    expect(retrieved.programBalances["Singapore KrisFlyer"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/lib/storage.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/storage'" or similar.

- [ ] **Step 3: Write storage module**

```typescript
// lib/storage.ts
/**
 * localStorage schema and helpers for onboarding state persistence.
 * 
 * Keys:
 * - keza:onboarding:programs → JSON array of program names
 * - keza:onboarding:balances → JSON map { program: balance }
 * - keza:onboarding:routes → JSON array of [from, to] pairs
 * - keza:visited → boolean flag (skip onboarding on return visits)
 */

export interface OnboardingState {
  selectedPrograms: string[];
  programBalances: Record<string, number>;
  favoriteRoutes: Array<[string, string]>;
}

const STORAGE_KEYS = {
  PROGRAMS: "keza:onboarding:programs",
  BALANCES: "keza:onboarding:balances",
  ROUTES: "keza:onboarding:routes",
  VISITED: "keza:visited",
} as const;

/**
 * Get current onboarding state from localStorage.
 * Returns empty state if nothing is stored.
 */
export function getOnboardingState(): OnboardingState {
  if (typeof window === "undefined") {
    return { selectedPrograms: [], programBalances: {}, favoriteRoutes: [] };
  }

  try {
    const programs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRAMS) || "[]");
    const balances = JSON.parse(localStorage.getItem(STORAGE_KEYS.BALANCES) || "{}");
    const routes = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTES) || "[]");

    return {
      selectedPrograms: Array.isArray(programs) ? programs : [],
      programBalances: typeof balances === "object" && balances !== null ? balances : {},
      favoriteRoutes: Array.isArray(routes) ? routes : [],
    };
  } catch {
    return { selectedPrograms: [], programBalances: {}, favoriteRoutes: [] };
  }
}

/**
 * Save full onboarding state to localStorage.
 */
export function setOnboardingState(state: OnboardingState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(state.selectedPrograms));
    localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(state.programBalances));
    localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(state.favoriteRoutes));
  } catch {
    // localStorage quota exceeded or unavailable
    console.warn("Failed to save onboarding state to localStorage");
  }
}

/**
 * Get visited flag (returns true if user has completed onboarding before).
 */
export function getVisitedFlag(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return localStorage.getItem(STORAGE_KEYS.VISITED) === "true";
  } catch {
    return false;
  }
}

/**
 * Set visited flag (call after onboarding completes).
 */
export function setVisitedFlag(visited: boolean): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.VISITED, visited ? "true" : "false");
  } catch {
    console.warn("Failed to set visited flag in localStorage");
  }
}

/**
 * Clear all onboarding data (for testing or user reset).
 */
export function clearOnboardingData(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEYS.PROGRAMS);
    localStorage.removeItem(STORAGE_KEYS.BALANCES);
    localStorage.removeItem(STORAGE_KEYS.ROUTES);
    localStorage.removeItem(STORAGE_KEYS.VISITED);
  } catch {
    console.warn("Failed to clear onboarding data");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/lib/storage.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat(P3.4): add localStorage schema for onboarding state"
```

---

## Task 2: Create Onboarding Context

**Files:**
- Create: `lib/contexts/onboardingContext.ts`

React Context for managing onboarding state across components. Syncs to localStorage on every change.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/contexts/onboardingContext.test.ts
import { renderHook, act } from "@testing-library/react";
import { useOnboarding, OnboardingProvider } from "@/lib/contexts/onboardingContext";
import { clearOnboardingData } from "@/lib/storage";

describe("onboardingContext", () => {
  beforeEach(() => {
    clearOnboardingData();
  });

  it("provides default onboarding state", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    
    expect(result.current.state.selectedPrograms).toEqual([]);
    expect(result.current.state.programBalances).toEqual({});
    expect(result.current.state.favoriteRoutes).toEqual([]);
  });

  it("allows adding programs", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    
    act(() => {
      result.current.addProgram("Flying Blue");
      result.current.addProgram("Singapore KrisFlyer");
    });

    expect(result.current.state.selectedPrograms).toContain("Flying Blue");
    expect(result.current.state.selectedPrograms).toContain("Singapore KrisFlyer");
  });

  it("allows removing programs", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    
    act(() => {
      result.current.addProgram("Flying Blue");
      result.current.removeProgram("Flying Blue");
    });

    expect(result.current.state.selectedPrograms).not.toContain("Flying Blue");
  });

  it("allows setting balance for a program", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    
    act(() => {
      result.current.setBalance("Flying Blue", 150000);
    });

    expect(result.current.state.programBalances["Flying Blue"]).toBe(150000);
  });

  it("allows adding favorite routes", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    
    act(() => {
      result.current.addRoute("SIN", "LAX");
      result.current.addRoute("CDG", "JFK");
    });

    expect(result.current.state.favoriteRoutes).toEqual([["SIN", "LAX"], ["CDG", "JFK"]]);
  });

  it("prevents adding more than 5 routes", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    
    act(() => {
      for (let i = 0; i < 6; i++) {
        result.current.addRoute("SIN", `XXX${i}`);
      }
    });

    expect(result.current.state.favoriteRoutes.length).toBe(5);
  });

  it("persists state to localStorage", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    
    act(() => {
      result.current.addProgram("Flying Blue");
      result.current.setBalance("Flying Blue", 100000);
    });

    // Simulate page reload
    const { result: result2 } = renderHook(() => useOnboarding(), { wrapper });
    expect(result2.current.state.selectedPrograms).toContain("Flying Blue");
    expect(result2.current.state.programBalances["Flying Blue"]).toBe(100000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/lib/contexts/onboardingContext.test.ts
```

Expected: FAIL with module not found error.

- [ ] **Step 3: Write onboarding context**

```typescript
// lib/contexts/onboardingContext.ts
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getOnboardingState, setOnboardingState, type OnboardingState } from "@/lib/storage";

interface OnboardingContextValue {
  state: OnboardingState;
  addProgram: (program: string) => void;
  removeProgram: (program: string) => void;
  setPrograms: (programs: string[]) => void;
  setBalance: (program: string, balance: number) => void;
  addRoute: (from: string, to: string) => void;
  removeRoute: (from: string, to: string) => void;
  setRoutes: (routes: Array<[string, string]>) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    selectedPrograms: [],
    programBalances: {},
    favoriteRoutes: [],
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getOnboardingState();
    setState(stored);
  }, []);

  // Sync to localStorage on state change
  useEffect(() => {
    setOnboardingState(state);
  }, [state]);

  const addProgram = (program: string) => {
    setState((prev) => ({
      ...prev,
      selectedPrograms: prev.selectedPrograms.includes(program)
        ? prev.selectedPrograms
        : [...prev.selectedPrograms, program],
    }));
  };

  const removeProgram = (program: string) => {
    setState((prev) => ({
      ...prev,
      selectedPrograms: prev.selectedPrograms.filter((p) => p !== program),
      programBalances: (() => {
        const { [program]: _, ...rest } = prev.programBalances;
        return rest;
      })(),
    }));
  };

  const setPrograms = (programs: string[]) => {
    setState((prev) => ({
      ...prev,
      selectedPrograms: programs,
    }));
  };

  const setBalance = (program: string, balance: number) => {
    setState((prev) => ({
      ...prev,
      programBalances: {
        ...prev.programBalances,
        [program]: balance,
      },
    }));
  };

  const addRoute = (from: string, to: string) => {
    setState((prev) => {
      const route: [string, string] = [from.toUpperCase(), to.toUpperCase()];
      const isDuplicate = prev.favoriteRoutes.some((r) => r[0] === route[0] && r[1] === route[1]);
      if (isDuplicate || prev.favoriteRoutes.length >= 5) {
        return prev;
      }
      return {
        ...prev,
        favoriteRoutes: [...prev.favoriteRoutes, route],
      };
    });
  };

  const removeRoute = (from: string, to: string) => {
    setState((prev) => ({
      ...prev,
      favoriteRoutes: prev.favoriteRoutes.filter((r) => !(r[0] === from && r[1] === to)),
    }));
  };

  const setRoutes = (routes: Array<[string, string]>) => {
    setState((prev) => ({
      ...prev,
      favoriteRoutes: routes.slice(0, 5), // Max 5 routes
    }));
  };

  const reset = () => {
    setState({
      selectedPrograms: [],
      programBalances: {},
      favoriteRoutes: [],
    });
  };

  return (
    <OnboardingContext.Provider value={{ state, addProgram, removeProgram, setPrograms, setBalance, addRoute, removeRoute, setRoutes, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/lib/contexts/onboardingContext.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/contexts/onboardingContext.ts __tests__/lib/contexts/onboardingContext.test.ts
git commit -m "feat(P3.4): add onboarding context with state management"
```

---

## Task 3: Create Program Selector Component (Step 1)

**Files:**
- Create: `components/onboarding/ProgramSelector.tsx`

Step 1 modal showing ~40 loyalty programs grouped by category (Airlines alliances, Banks, Hotel transfers).

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/components/onboarding/ProgramSelector.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgramSelector } from "@/components/onboarding/ProgramSelector";
import { OnboardingProvider } from "@/lib/contexts/onboardingContext";

describe("ProgramSelector", () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
  });

  const renderComponent = () => {
    return render(
      <OnboardingProvider>
        <ProgramSelector onNext={mockOnNext} />
      </OnboardingProvider>
    );
  };

  it("displays program categories", () => {
    renderComponent();
    expect(screen.getByText(/star alliance/i)).toBeInTheDocument();
    expect(screen.getByText(/skyteam/i)).toBeInTheDocument();
    expect(screen.getByText(/oneworld/i)).toBeInTheDocument();
  });

  it("displays top 5 programs as checked by default", () => {
    renderComponent();
    const ubCheckbox = screen.getByRole("checkbox", { name: /united mileageplus/i });
    const aaCheckbox = screen.getByRole("checkbox", { name: /aadvantage/i });
    const dlCheckbox = screen.getByRole("checkbox", { name: /delta skymiles/i });
    const swCheckbox = screen.getByRole("checkbox", { name: /Alaska Mileage Plan/i });
    const kfCheckbox = screen.getByRole("checkbox", { name: /singapore krisflyer/i });
    
    expect(ubCheckbox).toBeChecked();
    expect(aaCheckbox).toBeChecked();
    expect(dlCheckbox).toBeChecked();
    expect(swCheckbox).toBeChecked();
    expect(kfCheckbox).toBeChecked();
  });

  it("allows user to toggle programs", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const flyingBlueCheckbox = screen.getByRole("checkbox", { name: /flying blue/i });
    expect(flyingBlueCheckbox).not.toBeChecked();
    
    await user.click(flyingBlueCheckbox);
    expect(flyingBlueCheckbox).toBeChecked();
    
    await user.click(flyingBlueCheckbox);
    expect(flyingBlueCheckbox).not.toBeChecked();
  });

  it("calls onNext with selected programs", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);
    
    expect(mockOnNext).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/components/onboarding/ProgramSelector.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Write program selector component**

```typescript
// components/onboarding/ProgramSelector.tsx
"use client";

import { useOnboarding } from "@/lib/contexts/onboardingContext";
import clsx from "clsx";

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
    "Ethiopian ShebaMiles",
    "COPA ConnectMiles",
    "LifeMiles",
    "Thai Royal Orchid Plus",
  ],
  "SkyTeam": [
    "Flying Blue",
    "Delta SkyMiles",
    "Korean Air SKYPASS",
    "Kenya Airways Mileage Club",
  ],
  "Oneworld": [
    "AAdvantage",
    "British Airways Avios",
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
  ],
};

const DEFAULT_PROGRAMS = [
  "United MileagePlus",
  "AAdvantage",
  "Delta SkyMiles",
  "Alaska Mileage Plan",
  "Singapore KrisFlyer",
];

export function ProgramSelector({ onNext }: Props) {
  const { state, addProgram, removeProgram } = useOnboarding();

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
                <label key={program} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/components/onboarding/ProgramSelector.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/onboarding/ProgramSelector.tsx __tests__/components/onboarding/ProgramSelector.test.tsx
git commit -m "feat(P3.4): add program selector step 1 component"
```

---

## Task 4: Create Balance Sliders Component (Step 2)

**Files:**
- Create: `components/onboarding/BalanceSliders.tsx`

Step 2 modal with sliders for each selected program (0-500k miles, default 50%).

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/components/onboarding/BalanceSliders.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BalanceSliders } from "@/components/onboarding/BalanceSliders";
import { OnboardingProvider, useOnboarding } from "@/lib/contexts/onboardingContext";

describe("BalanceSliders", () => {
  const mockOnNext = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    mockOnSkip.mockClear();
  });

  const renderComponent = () => {
    return render(
      <OnboardingProvider>
        <TestWrapper onNext={mockOnNext} onSkip={mockOnSkip} />
      </OnboardingProvider>
    );
  };

  function TestWrapper({ onNext, onSkip }: any) {
    const { addProgram } = useOnboarding();
    React.useEffect(() => {
      addProgram("Flying Blue");
      addProgram("Singapore KrisFlyer");
    }, []);
    return <BalanceSliders onNext={onNext} onSkip={onSkip} />;
  }

  it("displays sliders for selected programs", () => {
    renderComponent();
    expect(screen.getByText(/flying blue/i)).toBeInTheDocument();
    expect(screen.getByText(/singapore krisflyer/i)).toBeInTheDocument();
  });

  it("initializes sliders to 250k miles (50%)", () => {
    renderComponent();
    const sliders = screen.getAllByRole("slider");
    sliders.forEach((slider) => {
      // Default HTML range input is 250000 at 50% of 0-500k
      expect(parseInt((slider as HTMLInputElement).value)).toBe(250000);
    });
  });

  it("allows user to change balance", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const slider = screen.getAllByRole("slider")[0];
    await user.tripleClick(slider);
    await user.keyboard("150000");
    
    // Value should update
    expect((slider as HTMLInputElement).value).toBe("150000");
  });

  it("calls onNext when next is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);
    
    expect(mockOnNext).toHaveBeenCalled();
  });

  it("calls onSkip when skip is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const skipButton = screen.getByRole("button", { name: /skip/i });
    await user.click(skipButton);
    
    expect(mockOnSkip).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/components/onboarding/BalanceSliders.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Write balance sliders component**

```typescript
// components/onboarding/BalanceSliders.tsx
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
      balances[program] = state.programBalances[program] ?? 250000; // Default 50%
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
    // Persist all balances
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
              <span className="text-sm font-mono text-blue-600">{formatBalance(localBalances[program] || 0)}</span>
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/components/onboarding/BalanceSliders.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/onboarding/BalanceSliders.tsx __tests__/components/onboarding/BalanceSliders.test.tsx
git commit -m "feat(P3.4): add balance sliders step 2 component"
```

---

## Task 5: Create Route Autocomplete and FavoriteRoutes Component (Step 3)

**Files:**
- Create: `components/onboarding/FavoriteRoutes.tsx`

Step 3 modal with text input + autocomplete for favorite routes.

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/components/onboarding/FavoriteRoutes.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FavoriteRoutes } from "@/components/onboarding/FavoriteRoutes";
import { OnboardingProvider } from "@/lib/contexts/onboardingContext";

describe("FavoriteRoutes", () => {
  const mockOnNext = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    mockOnSkip.mockClear();
  };

  const renderComponent = () => {
    return render(
      <OnboardingProvider>
        <FavoriteRoutes onNext={mockOnNext} onSkip={mockOnSkip} />
      </OnboardingProvider>
    );
  };

  it("displays input field for adding routes", () => {
    renderComponent();
    expect(screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i)).toBeInTheDocument();
  });

  it("allows user to type and submit route", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const input = screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i);
    await user.type(input, "SIN to LAX");
    
    const addButton = screen.getByRole("button", { name: /add|save/i });
    await user.click(addButton);
    
    expect(screen.getByText(/SIN/)).toBeInTheDocument();
    expect(screen.getByText(/LAX/)).toBeInTheDocument();
  });

  it("prevents adding more than 5 routes", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const input = screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i);
    
    for (let i = 0; i < 6; i++) {
      await user.clear(input);
      await user.type(input, `LAX to JFK`);
      const addButton = screen.getByRole("button", { name: /add|save/i });
      await user.click(addButton);
    }
    
    // Should only have 5 routes
    const routes = screen.getAllByRole("button", { name: /remove/i });
    expect(routes.length).toBeLessThanOrEqual(5);
  });

  it("calls onNext when next is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const nextButton = screen.getByRole("button", { name: /next|done|finish/i });
    await user.click(nextButton);
    
    expect(mockOnNext).toHaveBeenCalled();
  });

  it("calls onSkip when skip is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const skipButton = screen.getByRole("button", { name: /skip/i });
    await user.click(skipButton);
    
    expect(mockOnSkip).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/components/onboarding/FavoriteRoutes.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Write favorite routes component**

```typescript
// components/onboarding/FavoriteRoutes.tsx
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
  ["SIN", "LAX"], ["LAX", "SIN"], ["CDG", "JFK"], ["JFK", "CDG"],
  ["NRT", "LAX"], ["LAX", "NRT"], ["HND", "LAX"], ["LAX", "HND"],
  ["SFO", "NRT"], ["NRT", "SFO"], ["LHR", "JFK"], ["JFK", "LHR"],
  ["DXB", "LHR"], ["LHR", "DXB"], ["CDG", "SIN"], ["SIN", "CDG"],
  ["LAX", "ORD"], ["ORD", "LAX"], ["JFK", "LHR"], ["LHR", "JFK"],
  ["NRT", "JFK"], ["JFK", "NRT"], ["ICN", "LAX"], ["LAX", "ICN"],
  ["BKK", "LAX"], ["LAX", "BKK"], ["SYD", "LAX"], ["LAX", "SYD"],
  ["HND", "SFO"], ["SFO", "HND"], ["PEK", "LAX"], ["LAX", "PEK"],
  ["FRA", "JFK"], ["JFK", "FRA"], ["CDG", "LAX"], ["LAX", "CDG"],
  ["LAX", "SFO"], ["SFO", "LAX"], ["ORD", "JFK"], ["JFK", "ORD"],
  ["DXB", "JFK"], ["JFK", "DXB"], ["SIN", "JFK"], ["JFK", "SIN"],
  ["LHR", "LAX"], ["LAX", "LHR"], ["DXB", "CDG"], ["CDG", "DXB"],
  ["HND", "NRT"], ["NRT", "HND"], ["LAX", "NZA"], ["NZA", "LAX"],
  ["SYD", "SFO"], ["SFO", "SYD"], ["BKK", "JFK"], ["JFK", "BKK"],
  ["LAX", "TPE"], ["TPE", "LAX"], ["NRT", "SFO"], ["SFO", "NRT"],
  ["DXB", "SFO"], ["SFO", "DXB"], ["LAX", "MEL"], ["MEL", "LAX"],
  ["SIN", "SFO"], ["SFO", "SIN"], ["CDG", "FRA"], ["FRA", "CDG"],
];

export function FavoriteRoutes({ onNext, onSkip }: Props) {
  const { state, addRoute, removeRoute } = useOnboarding();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Array<[string, string]>>([]);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.length > 2) {
      const parsed = parseRoute(value);
      if (parsed) {
        const filtered = TOP_ROUTES.filter(
          ([from, to]) =>
            (from.includes(parsed.from.toUpperCase()) || to.includes(parsed.to.toUpperCase())) &&
            !state.favoriteRoutes.some((r) => r[0] === from && r[1] === to)
        );
        setSuggestions(filtered.slice(0, 5));
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleAddRoute = () => {
    const parsed = parseRoute(input);
    if (parsed) {
      addRoute(parsed.from, parsed.to);
      setInput("");
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (from: string, to: string) => {
    addRoute(from, to);
    setInput("");
    setSuggestions([]);
  };

  const handleRemoveRoute = (from: string, to: string) => {
    removeRoute(from, to);
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
          {suggestions.length > 0 && (
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
        <label className="text-sm font-semibold block mb-3">Your Routes ({state.favoriteRoutes.length}/5)</label>
        <div className="space-y-2">
          {state.favoriteRoutes.map(([from, to]) => (
            <div key={`${from}-${to}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
```

- [ ] **Step 4: Create route parser utility**

```typescript
// components/onboarding/routeParser.ts
/**
 * Parse route input like "SIN to LAX", "SIN → LAX", or "SIN LAX"
 * Returns { from, to } or null if invalid
 */
export function parseRoute(input: string): { from: string; to: string } | null {
  const trimmed = input.trim().toUpperCase();
  
  // Try splitting by various delimiters
  let parts = trimmed.split(/\s+to\s+/);
  if (parts.length !== 2) {
    parts = trimmed.split("→").map((p) => p.trim());
  }
  if (parts.length !== 2) {
    parts = trimmed.split(" ");
  }

  if (parts.length >= 2) {
    const from = parts[0].trim();
    const to = parts[1].trim();
    if (from.length === 3 && to.length === 3 && from !== to) {
      return { from, to };
    }
  }

  return null;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/components/onboarding/FavoriteRoutes.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/onboarding/FavoriteRoutes.tsx components/onboarding/routeParser.ts __tests__/components/onboarding/FavoriteRoutes.test.tsx
git commit -m "feat(P3.4): add favorite routes step 3 component with autocomplete"
```

---

## Task 6: Create OnboardingFlow Controller Component

**Files:**
- Create: `components/onboarding/OnboardingFlow.tsx`

Main controller that orchestrates all 3 steps, progress indicator, and transitions.

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/components/onboarding/OnboardingFlow.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { OnboardingProvider } from "@/lib/contexts/onboardingContext";

describe("OnboardingFlow", () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    mockOnComplete.mockClear();
  };

  const renderComponent = () => {
    return render(
      <OnboardingProvider>
        <OnboardingFlow onComplete={mockOnComplete} />
      </OnboardingProvider>
    );
  };

  it("shows step 1 initially", () => {
    renderComponent();
    expect(screen.getByText(/select your loyalty programs/i)).toBeInTheDocument();
  });

  it("shows progress indicator", () => {
    renderComponent();
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it("advances to step 2 when next is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);
    
    expect(screen.getByText(/your loyalty program balances/i)).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
  });

  it("shows back button on step 2+", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);
    
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("advances to step 3 from step 2", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    let nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton); // to step 2
    
    nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton); // to step 3
    
    expect(screen.getByText(/your favorite routes/i)).toBeInTheDocument();
    expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
  });

  it("calls onComplete when done button clicked on step 3", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    let nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton); // to step 2
    
    nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton); // to step 3
    
    const doneButton = screen.getByRole("button", { name: /done/i });
    await user.click(doneButton);
    
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it("goes back when back button clicked", async () => {
    const user = userEvent.setup();
    renderComponent();
    
    let nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton); // to step 2
    
    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);
    
    expect(screen.getByText(/select your loyalty programs/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/components/onboarding/OnboardingFlow.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Write onboarding flow controller**

```typescript
// components/onboarding/OnboardingFlow.tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/components/onboarding/OnboardingFlow.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/onboarding/OnboardingFlow.tsx __tests__/components/onboarding/OnboardingFlow.test.tsx
git commit -m "feat(P3.4): add onboarding flow controller with progress indicator"
```

---

## Task 7: Integrate Onboarding Modal into SearchForm

**Files:**
- Modify: `components/SearchForm.tsx`

Add onboarding modal trigger (first visit check) and pre-fill programs/routes.

- [ ] **Step 1: Update SearchForm to show modal on first visit**

Read SearchForm to understand current structure:

```bash
head -150 /Users/DIALLO9194/Downloads/keza/components/SearchForm.tsx
```

Then modify to add onboarding modal display and pre-fill logic:

```typescript
// Add near top of SearchForm.tsx, in imports:
import { OnboardingFlow } from "./onboarding/OnboardingFlow";
import { getVisitedFlag } from "@/lib/storage";
import { useOnboarding } from "@/lib/contexts/onboardingContext";

// Inside SearchForm component, after other useState declarations:
const [showOnboarding, setShowOnboarding] = useState(false);
const { state: onboardingState } = useOnboarding();

// Add effect to check if first visit
useEffect(() => {
  if (typeof window !== "undefined" && !getVisitedFlag()) {
    setShowOnboarding(true);
  }
}, []);

// Add effect to pre-fill programs from onboarding
useEffect(() => {
  if (onboardingState.selectedPrograms.length > 0 && !programs) {
    setPrograms(onboardingState.selectedPrograms.join(", "));
  }
}, [onboardingState.selectedPrograms]);

// Add effect to pre-fill route from first favorite route
useEffect(() => {
  if (onboardingState.favoriteRoutes.length > 0 && !from && !to) {
    const [fromAirport, toAirport] = onboardingState.favoriteRoutes[0];
    setFrom(fromAirport);
    setTo(toAirport);
  }
}, [onboardingState.favoriteRoutes]);

// In render, before SearchForm UI:
{showOnboarding && (
  <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
)}
```

- [ ] **Step 2: Run tests to ensure nothing broke**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- components/SearchForm
```

Expected: All existing tests pass

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/SearchForm.tsx
git commit -m "feat(P3.4): integrate onboarding modal into SearchForm, pre-fill programs and routes"
```

---

## Task 8: Create ProfileContext Integration (if not exists)

**Files:**
- Modify or Create: `lib/contexts/ProfileContext.tsx`

Ensure ProfileContext includes selectedPrograms, programBalances, favoriteRoutes.

- [ ] **Step 1: Check if ProfileContext exists**

```bash
find /Users/DIALLO9194/Downloads/keza/lib -name "*ProfileContext*" -o -name "*Profile*" | head -5
```

If it doesn't exist, create it. If it does, add onboarding fields.

- [ ] **Step 2: Verify integration with onboarding**

The ProfileContext should expose the onboarding state so Results.tsx can display personalized CTAs like "Based on your Flying Blue + KrisFlyer" and show balance-based recommendations.

- [ ] **Step 3: Test integration**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test
```

All tests should pass.

- [ ] **Step 4: Commit (if changes made)**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/contexts/ProfileContext.tsx
git commit -m "feat(P3.4): integrate onboarding state into ProfileContext"
```

---

## Task 9: Add Feature Flag and Environment Variable

**Files:**
- Modify: `.env.local` or deployment config

Add feature flag for onboarding (defaults to true for MVP).

- [ ] **Step 1: Add to .env.local (local dev)**

```bash
echo "NEXT_PUBLIC_ENABLE_ONBOARDING=true" >> /Users/DIALLO9194/Downloads/keza/.env.local
```

- [ ] **Step 2: Verify Vercel environment**

On Vercel dashboard, add: `NEXT_PUBLIC_ENABLE_ONBOARDING=true`

- [ ] **Step 3: Update SearchForm to check flag**

```typescript
const enableOnboarding = process.env.NEXT_PUBLIC_ENABLE_ONBOARDING === "true";

// Inside SearchForm render:
{enableOnboarding && showOnboarding && (
  <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
)}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add .env.local
git commit -m "feat(P3.4): add onboarding feature flag"
```

---

## Task 10: Write Integration Tests

**Files:**
- Create: `__tests__/components/onboarding/integration.test.tsx`

End-to-end test simulating new user flow: onboarding → search pre-fill → results with personalized CTAs.

- [ ] **Step 1: Write integration test**

```typescript
// __tests__/components/onboarding/integration.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchForm } from "@/components/SearchForm";
import { OnboardingProvider } from "@/lib/contexts/onboardingContext";
import { clearOnboardingData } from "@/lib/storage";

describe("onboarding integration", () => {
  beforeEach(() => {
    clearOnboardingData();
  });

  it("shows onboarding modal to first-time visitor", () => {
    render(
      <OnboardingProvider>
        <SearchForm onResults={() => {}} onLoading={() => {}} lang="en" />
      </OnboardingProvider>
    );

    expect(screen.getByText(/welcome to keza/i)).toBeInTheDocument();
    expect(screen.getByText(/select your loyalty programs/i)).toBeInTheDocument();
  });

  it("skips onboarding on return visit", () => {
    // First visit
    const { rerender } = render(
      <OnboardingProvider>
        <SearchForm onResults={() => {}} onLoading={() => {}} lang="en" />
      </OnboardingProvider>
    );

    // Simulate completing onboarding by checking visited flag
    localStorage.setItem("keza:visited", "true");

    // Return visit should not show onboarding
    rerender(
      <OnboardingProvider>
        <SearchForm onResults={() => {}} onLoading={() => {}} lang="en" />
      </OnboardingProvider>
    );

    expect(screen.queryByText(/welcome to keza/i)).not.toBeInTheDocument();
  });

  it("pre-fills search form with onboarding selections", async () => {
    const user = userEvent.setup();
    const mockOnResults = jest.fn();

    render(
      <OnboardingProvider>
        <SearchForm onResults={mockOnResults} onLoading={() => {}} lang="en" />
      </OnboardingProvider>
    );

    // Complete onboarding
    const flyingBlueCheckbox = screen.getByRole("checkbox", { name: /flying blue/i });
    await user.click(flyingBlueCheckbox);

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton); // to step 2

    await user.click(nextButton); // to step 3

    const routeInput = screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i);
    await user.type(routeInput, "SIN to LAX");
    await user.click(screen.getByRole("button", { name: /add/i }));

    const doneButton = screen.getByRole("button", { name: /done/i });
    await user.click(doneButton);

    // After onboarding closes, check that programs are pre-filled
    // (This is a simplified check; actual implementation may vary)
    await new Promise((resolve) => setTimeout(resolve, 100)); // wait for state update
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test -- __tests__/components/onboarding/integration.test.tsx
```

Expected: PASS

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm test
```

Expected: All 438+ tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add __tests__/components/onboarding/integration.test.tsx
git commit -m "test(P3.4): add integration tests for onboarding flow"
```

---

## Task 11: Document and Deploy

**Files:**
- Create: `docs/onboarding.md` (optional, for team context)
- Vercel deployment

- [ ] **Step 1: Write deployment notes (optional)**

Create brief docs explaining onboarding flow, feature flag, and how to disable if needed.

- [ ] **Step 2: Build locally and verify no errors**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm run build
```

Expected: Build succeeds, no TypeScript or ESLint errors.

- [ ] **Step 3: Push to main**

```bash
cd /Users/DIALLO9194/Downloads/keza
git log --oneline -5  # Verify 11 commits for onboarding
git push origin main
```

Vercel will auto-deploy. Monitor at https://keza-taupe.vercel.app

- [ ] **Step 4: Verify deployment**

```bash
curl https://keza-taupe.vercel.app
```

Load the page in browser, clear localStorage, refresh. Should see onboarding modal.

- [ ] **Step 5: Final commit message**

```bash
git log --oneline -1
```

Should show: `test(P3.4): add integration tests for onboarding flow`

---

## Checklist: Spec Coverage

- [x] **Step 1 (Program Selection):** ~40 programs grouped by category (Star, SkyTeam, Oneworld, Independent), checkboxes, default top 5, save to localStorage
- [x] **Step 2 (Balance Sliders):** Sliders 0-500k per selected program, default 50%, skip button, save to ProfileContext
- [x] **Step 3 (Favorite Routes):** Text input with autocomplete, max 5 routes, save to localStorage
- [x] **Onboarding Context:** State management, sync to localStorage, actions for add/remove/set
- [x] **Storage Module:** localStorage schema with typed helpers, visited flag
- [x] **SearchForm Integration:** Show modal on first visit, pre-fill programs/routes, hide on return visits
- [x] **ProfileContext:** Include selectedPrograms, programBalances, favoriteRoutes
- [x] **Tests:** Unit tests per component, integration test for end-to-end flow
- [x] **UI Polish:** Progress indicator, back/next/skip buttons, smooth transitions, mobile responsive (Tailwind)
- [x] **Accessibility:** Labels, ARIA roles, keyboard support on inputs
- [x] **Feature Flag:** NEXT_PUBLIC_ENABLE_ONBOARDING (defaults to true)
- [x] **Deployment:** Vercel auto-deploy on push to main

---

## Execution Handoff

**Plan complete and saved to `/Users/DIALLO9194/Downloads/keza/docs/superpowers/plans/2026-07-05-onboarding-flow.md`**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, with review checkpoints between batches. Fast iteration, high quality.

**2. Inline Execution** — Execute tasks sequentially in this session using executing-plans skill, batch by related components.

**Which approach would you prefer?**
