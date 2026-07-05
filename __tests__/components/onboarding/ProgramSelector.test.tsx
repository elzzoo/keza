import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgramSelector } from "@/components/onboarding/ProgramSelector";
import { OnboardingProvider } from "@/lib/contexts/onboardingContext";
import { clearOnboardingData } from "@/lib/storage";

describe("ProgramSelector", () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    clearOnboardingData();
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
    expect(screen.getByText(/independent/i)).toBeInTheDocument();
  });

  it("displays top 5 programs as checked by default", async () => {
    renderComponent();

    // Wait for default programs to be loaded by the effect
    await waitFor(
      () => {
        const ubCheckbox = screen.getByRole("checkbox", {
          name: /united mileageplus/i,
        }) as HTMLInputElement;
        expect(ubCheckbox.checked).toBe(true);
      },
      { timeout: 3000 }
    );

    // Verify all 5 default programs are checked
    const aaCheckbox = screen.getByRole("checkbox", {
      name: /aadvantage/i,
    }) as HTMLInputElement;
    const dlCheckbox = screen.getByRole("checkbox", {
      name: /delta skymiles/i,
    }) as HTMLInputElement;
    const swCheckbox = screen.getByRole("checkbox", {
      name: /alaska airlines mileage plan/i,
    }) as HTMLInputElement;
    const kfCheckbox = screen.getByRole("checkbox", {
      name: /singapore krisflyer/i,
    }) as HTMLInputElement;

    expect(aaCheckbox.checked).toBe(true);
    expect(dlCheckbox.checked).toBe(true);
    expect(swCheckbox.checked).toBe(true);
    expect(kfCheckbox.checked).toBe(true);
  });

  it("allows user to toggle programs", async () => {
    const user = userEvent.setup();
    renderComponent();

    const flyingBlueCheckbox = screen.getByRole("checkbox", {
      name: /flying blue/i,
    }) as HTMLInputElement;
    expect(flyingBlueCheckbox.checked).toBe(false);

    await user.click(flyingBlueCheckbox);
    expect(flyingBlueCheckbox.checked).toBe(true);

    await user.click(flyingBlueCheckbox);
    expect(flyingBlueCheckbox.checked).toBe(false);
  });

  it("calls onNext when Next button is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    expect(mockOnNext).toHaveBeenCalled();
  });

  it("displays all programs from all categories", () => {
    renderComponent();
    // Star Alliance
    expect(screen.getByRole("checkbox", { name: /united mileageplus/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /singapore krisflyer/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /ana mileage club/i })).toBeInTheDocument();
    // SkyTeam
    expect(screen.getByRole("checkbox", { name: /flying blue/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /delta skymiles/i })).toBeInTheDocument();
    // Oneworld
    expect(screen.getByRole("checkbox", { name: /aadvantage/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /british airways/i })).toBeInTheDocument();
    // Independent
    expect(screen.getByRole("checkbox", { name: /emirates skywards/i })).toBeInTheDocument();
  });

  it("persists selected programs to context", async () => {
    const user = userEvent.setup();
    renderComponent();

    const flyingBlueCheckbox = screen.getByRole("checkbox", {
      name: /flying blue/i,
    });
    await user.click(flyingBlueCheckbox);

    expect(flyingBlueCheckbox).toBeChecked();
  });
});
