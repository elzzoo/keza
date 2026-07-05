import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BalanceSliders } from "@/components/onboarding/BalanceSliders";
import { OnboardingProvider, useOnboarding } from "@/lib/contexts/onboardingContext";
import React from "react";
import { act } from "@testing-library/react";

describe("BalanceSliders", () => {
  const mockOnNext = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    mockOnSkip.mockClear();
  });

  const renderComponent = async () => {
    let contextSetter: any = null;
    const TestWrapper = ({ onNext, onSkip }: any) => {
      const context = useOnboarding();
      contextSetter = context;
      return <BalanceSliders onNext={onNext} onSkip={onSkip} />;
    };

    const result = render(
      <OnboardingProvider>
        <TestWrapper onNext={mockOnNext} onSkip={mockOnSkip} />
      </OnboardingProvider>
    );

    // Add programs after render
    if (contextSetter) {
      await act(async () => {
        contextSetter.addProgram("Flying Blue");
        contextSetter.addProgram("Singapore KrisFlyer");
      });
    }

    return result;
  };

  it("displays sliders for selected programs", async () => {
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/flying blue/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/singapore krisflyer/i)).toBeInTheDocument();
  });

  it("initializes sliders to 250k miles (50%)", async () => {
    await renderComponent();
    await waitFor(() => {
      const sliders = screen.getAllByRole("slider");
      sliders.forEach((slider) => {
        expect(parseInt((slider as HTMLInputElement).value)).toBe(250000);
      });
    });
  });

  it("allows user to change balance", async () => {
    await renderComponent();

    await waitFor(() => {
      const slider = screen.getAllByRole("slider")[0];
      expect(slider).toBeInTheDocument();
    });

    const slider = screen.getAllByRole("slider")[0] as HTMLInputElement;
    // Change the slider value and dispatch change event
    await act(async () => {
      slider.value = "150000";
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(parseInt(slider.value)).toBe(150000);
  });

  it("calls onNext when next is clicked", async () => {
    const user = userEvent.setup();
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    expect(mockOnNext).toHaveBeenCalled();
  });

  it("calls onSkip when skip is clicked", async () => {
    const user = userEvent.setup();
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
    });

    const skipButton = screen.getByRole("button", { name: /skip/i });
    await user.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalled();
  });
});
