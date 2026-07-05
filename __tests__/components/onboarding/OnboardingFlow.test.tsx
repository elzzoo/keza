import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { OnboardingProvider } from "@/lib/contexts/onboardingContext";
import { clearOnboardingData } from "@/lib/storage";

describe("OnboardingFlow", () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    mockOnComplete.mockClear();
    clearOnboardingData();
  });

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

    // Wait for default programs to load
    await waitFor(
      () => {
        expect(screen.getByRole("checkbox", { name: /united mileageplus/i })).toBeChecked();
      },
      { timeout: 3000 }
    );

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    expect(screen.getByText(/your loyalty program balances/i)).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
  });

  it("shows back button on step 2+", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for default programs to load
    await waitFor(
      () => {
        expect(screen.getByRole("checkbox", { name: /united mileageplus/i })).toBeChecked();
      },
      { timeout: 3000 }
    );

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("advances to step 3 from step 2", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for default programs to load
    await waitFor(
      () => {
        expect(screen.getByRole("checkbox", { name: /united mileageplus/i })).toBeChecked();
      },
      { timeout: 3000 }
    );

    let nextButton = screen.getAllByRole("button", { name: /next/i })[0];
    await user.click(nextButton); // to step 2

    // Find the "Next" button on step 2 (the last one)
    nextButton = screen.getAllByRole("button", { name: /next/i })[0];
    await user.click(nextButton); // to step 3

    expect(screen.getByText(/your favorite routes/i)).toBeInTheDocument();
    expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
  });

  it("calls onComplete when done button clicked on step 3", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for default programs to load
    await waitFor(
      () => {
        expect(screen.getByRole("checkbox", { name: /united mileageplus/i })).toBeChecked();
      },
      { timeout: 3000 }
    );

    let nextButton = screen.getAllByRole("button", { name: /next/i })[0];
    await user.click(nextButton); // to step 2

    nextButton = screen.getAllByRole("button", { name: /next/i })[0];
    await user.click(nextButton); // to step 3

    const doneButton = screen.getByRole("button", { name: /done/i });
    await user.click(doneButton);

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it("goes back when back button clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for default programs to load
    await waitFor(
      () => {
        expect(screen.getByRole("checkbox", { name: /united mileageplus/i })).toBeChecked();
      },
      { timeout: 3000 }
    );

    let nextButton = screen.getAllByRole("button", { name: /next/i })[0];
    await user.click(nextButton); // to step 2

    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(screen.getByText(/select your loyalty programs/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it("shows skip button on steps 2 and 3", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for default programs to load
    await waitFor(
      () => {
        expect(screen.getByRole("checkbox", { name: /united mileageplus/i })).toBeChecked();
      },
      { timeout: 3000 }
    );

    let nextButton = screen.getAllByRole("button", { name: /next/i })[0];
    await user.click(nextButton); // to step 2

    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("progresses visual indicator as steps advance", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for default programs to load
    await waitFor(
      () => {
        expect(screen.getByRole("checkbox", { name: /united mileageplus/i })).toBeChecked();
      },
      { timeout: 3000 }
    );

    // Step 1
    let progressText = screen.getByText(/step 1 of 3/i);
    expect(progressText).toBeInTheDocument();

    let nextButton = screen.getAllByRole("button", { name: /next/i })[0];
    await user.click(nextButton); // to step 2

    // Step 2
    progressText = screen.getByText(/step 2 of 3/i);
    expect(progressText).toBeInTheDocument();

    nextButton = screen.getAllByRole("button", { name: /next/i })[0];
    await user.click(nextButton); // to step 3

    // Step 3
    progressText = screen.getByText(/step 3 of 3/i);
    expect(progressText).toBeInTheDocument();
  });
});
