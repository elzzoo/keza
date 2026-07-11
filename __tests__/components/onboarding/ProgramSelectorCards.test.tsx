import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgramSelectorCards } from "@/components/onboarding/ProgramSelectorCards";
import { OnboardingProvider } from "@/lib/contexts/onboardingContext";
import { clearOnboardingData } from "@/lib/storage";

describe("ProgramSelectorCards", () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    clearOnboardingData();
  });

  const renderComponent = () => {
    return render(
      <OnboardingProvider>
        <ProgramSelectorCards onNext={mockOnNext} />
      </OnboardingProvider>
    );
  };

  it("renders the component with heading and description", () => {
    renderComponent();
    expect(screen.getByText(/select your loyalty programs/i)).toBeInTheDocument();
    expect(screen.getByText(/choose the programs you're a member of/i)).toBeInTheDocument();
  });

  it("displays cards for all programs grouped by alliance", () => {
    renderComponent();
    // Check for alliance headings
    expect(screen.getByText(/star alliance/i)).toBeInTheDocument();
    expect(screen.getByText(/skyteam/i)).toBeInTheDocument();
    expect(screen.getByText(/oneworld/i)).toBeInTheDocument();
    expect(screen.getByText(/independent/i)).toBeInTheDocument();
  });

  it("displays program names on cards", () => {
    renderComponent();
    // Sample programs from globalPrograms
    expect(screen.getByText("Flying Blue")).toBeInTheDocument();
    expect(screen.getByText("United MileagePlus")).toBeInTheDocument();
    expect(screen.getByText("Emirates Skywards")).toBeInTheDocument();
  });

  it("allows user to select a program by clicking card", async () => {
    const user = userEvent.setup();
    renderComponent();

    const flyingBlueCard = screen.getByText("Flying Blue").closest("button");
    expect(flyingBlueCard).toBeInTheDocument();

    await user.click(flyingBlueCard!);

    await waitFor(() => {
      expect(flyingBlueCard).toHaveClass("ring-2", "ring-blue-500");
    });
  });

  it("allows user to deselect a program by clicking card again", async () => {
    const user = userEvent.setup();
    renderComponent();

    const flyingBlueCard = screen.getByText("Flying Blue").closest("button");

    // Select
    await user.click(flyingBlueCard!);
    await waitFor(() => {
      expect(flyingBlueCard).toHaveClass("ring-2");
    });

    // Deselect
    await user.click(flyingBlueCard!);
    await waitFor(() => {
      expect(flyingBlueCard).not.toHaveClass("ring-2");
    });
  });

  it("shows checkmark for selected programs", async () => {
    const user = userEvent.setup();
    renderComponent();

    const flyingBlueCard = screen.getByText("Flying Blue").closest("button");

    // Select
    await user.click(flyingBlueCard!);

    // Check for checkmark icon - look for SVG with checkmark path or check text
    await waitFor(() => {
      const checkmark = screen.getAllByText("✓").filter(
        (el) => el.closest("button") === flyingBlueCard
      );
      expect(checkmark.length).toBeGreaterThan(0);
    });
  });

  it("displays all programs from PROGRAMS_BY_NAME", () => {
    renderComponent();
    // Sample of major programs
    const samplePrograms = [
      "Flying Blue",
      "United MileagePlus",
      "Singapore KrisFlyer",
      "AAdvantage",
      "Emirates Skywards",
      "Etihad Guest",
    ];

    samplePrograms.forEach((program) => {
      expect(screen.getByText(program)).toBeInTheDocument();
    });
  });

  it("persists selected programs to onboarding context", async () => {
    const user = userEvent.setup();
    renderComponent();

    const flyingBlueCard = screen.getByText("Flying Blue").closest("button");
    const emiratesCard = screen.getByText("Emirates Skywards").closest("button");

    await user.click(flyingBlueCard!);
    await user.click(emiratesCard!);

    // Both should be selected
    await waitFor(() => {
      expect(flyingBlueCard).toHaveClass("ring-2");
      expect(emiratesCard).toHaveClass("ring-2");
    });
  });

  it("calls onNext when Next button is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    expect(mockOnNext).toHaveBeenCalled();
  });

  it("renders Next button", () => {
    renderComponent();
    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeInTheDocument();
  });

  it("groups programs by their alliance", () => {
    renderComponent();

    // Get all alliance sections
    const allianceSections = screen.getAllByRole("heading", { level: 3 });

    // Should have 4 alliances
    expect(allianceSections.length).toBe(4);

    // Verify the headings are there
    const headingTexts = allianceSections.map((h) => h.textContent);
    expect(headingTexts).toContain("Star Alliance");
    expect(headingTexts).toContain("SkyTeam");
    expect(headingTexts).toContain("Oneworld");
    expect(headingTexts).toContain("Independent");
  });

  it("displays airline code on cards", async () => {
    renderComponent();

    // Flying Blue is Air France (AF)
    const flyingBlueCard = screen.getByText("Flying Blue").closest("button");
    expect(flyingBlueCard).toHaveTextContent("AF");
  });

  it("maintains selected state when selecting multiple programs", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Use programs that are not in the default list
    const programs = [
      "Flying Blue",
      "Emirates Skywards",
      "Etihad Guest",
    ];

    // Select each program
    for (const program of programs) {
      const card = screen.getByText(program).closest("button");
      await user.click(card!);
    }

    // Verify all programs are selected
    await waitFor(() => {
      programs.forEach((program) => {
        const card = screen.getByText(program).closest("button");
        expect(card).toHaveAttribute("aria-pressed", "true");
      });
    });
  });
});
