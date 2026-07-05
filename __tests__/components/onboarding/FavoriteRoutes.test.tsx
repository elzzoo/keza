import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FavoriteRoutes } from "@/components/onboarding/FavoriteRoutes";
import { OnboardingProvider } from "@/lib/contexts/onboardingContext";
import { clearOnboardingData } from "@/lib/storage";

describe("FavoriteRoutes", () => {
  const mockOnNext = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    mockOnSkip.mockClear();
    clearOnboardingData();
  });

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

    const input = screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i) as HTMLInputElement;
    await user.type(input, "SIN to LAX");

    const addButton = screen.getByRole("button", { name: /add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/SIN/)).toBeInTheDocument();
    });
    expect(screen.getByText(/LAX/)).toBeInTheDocument();
  });

  it("prevents adding more than 5 routes", async () => {
    const user = userEvent.setup();
    renderComponent();

    const input = screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i) as HTMLInputElement;

    for (let i = 0; i < 6; i++) {
      await user.clear(input);
      await user.type(input, `LAX to JFK`);
      const addButton = screen.getByRole("button", { name: /add/i });
      await user.click(addButton);
    }

    // Should only have 5 routes
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    expect(removeButtons.length).toBeLessThanOrEqual(5);
  });

  it("calls onNext when next button is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    const nextButton = screen.getByRole("button", { name: /done/i });
    await user.click(nextButton);

    expect(mockOnNext).toHaveBeenCalled();
  });

  it("calls onSkip when skip button is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    const skipButton = screen.getByRole("button", { name: /skip/i });
    await user.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalled();
  });

  it("removes routes when remove button is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    const input = screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i) as HTMLInputElement;
    await user.type(input, "SIN to LAX");
    const addButton = screen.getByRole("button", { name: /add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/SIN → LAX/)).toBeInTheDocument();
    });

    const removeButton = screen.getByRole("button", { name: /remove/i });
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText(/SIN → LAX/)).not.toBeInTheDocument();
    });
  });

  it("displays route counter", async () => {
    const user = userEvent.setup();
    renderComponent();

    expect(screen.getByText(/your routes \(0\/5\)/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i) as HTMLInputElement;
    await user.type(input, "SIN to LAX");
    const addButton = screen.getByRole("button", { name: /add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/your routes \(1\/5\)/i)).toBeInTheDocument();
    });
  });

  it("disables add button when 5 routes are present", async () => {
    const user = userEvent.setup();
    renderComponent();

    const input = screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i) as HTMLInputElement;

    // Add 5 unique routes
    const routes = ["SIN to LAX", "CDG to JFK", "NRT to LAX", "HND to LAX", "DXB to LHR"];

    for (const route of routes) {
      await user.clear(input);
      await user.type(input, route);
      const addButton = screen.getByRole("button", { name: /add/i });
      await user.click(addButton);
    }

    await waitFor(() => {
      const addButton = screen.getByRole("button", { name: /add/i }) as HTMLButtonElement;
      expect(addButton.disabled).toBe(true);
    });
  });

  it("parses route formats correctly", async () => {
    const user = userEvent.setup();
    renderComponent();

    const input = screen.getByPlaceholderText(/SIN to LAX|SIN → LAX/i) as HTMLInputElement;

    // Test "SIN to LAX" format
    await user.type(input, "SIN to LAX");
    let addButton = screen.getByRole("button", { name: /add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/SIN → LAX/)).toBeInTheDocument();
    });

    // Clear input for next test
    await user.clear(input);

    // Test "CDG → JFK" format
    await user.type(input, "CDG → JFK");
    addButton = screen.getByRole("button", { name: /add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/CDG → JFK/)).toBeInTheDocument();
    });
  });
});
