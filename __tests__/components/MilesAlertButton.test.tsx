import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MilesAlertButton } from "@/components/MilesAlertButton";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("MilesAlertButton", () => {
  const defaultProps = {
    from: "SIN",
    to: "LAX",
    cabin: "economy",
    program: "Singapore KrisFlyer",
    currentCpp: 2.0,
    currentPrice: 800,
    lang: "en" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders button with alert icon and text", () => {
    render(<MilesAlertButton {...defaultProps} />);
    const button = screen.getByRole("button", { name: /miles alert/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("🔔");
  });

  it("displays French text when lang prop is 'fr'", () => {
    render(<MilesAlertButton {...defaultProps} lang="fr" />);
    const button = screen.getByRole("button", { name: /alerte miles/i });
    expect(button).toBeInTheDocument();
  });

  it("opens modal when button is clicked", async () => {
    render(<MilesAlertButton {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    const alertButton = buttons[0]; // First button is the alert button
    fireEvent.click(alertButton);

    await waitFor(() => {
      expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
    });
  });

  it("displays route and program info in modal", async () => {
    render(<MilesAlertButton {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Click alert button

    await waitFor(() => {
      expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
      expect(screen.getByText("Singapore KrisFlyer")).toBeInTheDocument();
    });
  });

  it("closes modal when close button is clicked", async () => {
    render(<MilesAlertButton {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Open modal

    await waitFor(() => {
      const closeButton = screen.getByLabelText(/close/i);
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      // Modal should be gone after closing
      expect(screen.queryByText("SIN-LAX")).not.toBeInTheDocument();
    });
  });

  it("closes modal when clicking outside of it", async () => {
    const { container } = render(<MilesAlertButton {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Open modal

    await waitFor(() => {
      const backdrop = container.querySelector('[class*="fixed inset-0"]');
      expect(backdrop).toBeInTheDocument();
      if (backdrop) {
        fireEvent.click(backdrop);
      }
    });

    await waitFor(() => {
      expect(screen.queryByText("SIN-LAX")).not.toBeInTheDocument();
    });
  });

  it("has correct button styling with amber theme", () => {
    render(<MilesAlertButton {...defaultProps} />);
    const button = screen.getByRole("button", { name: /miles alert/i });
    expect(button).toHaveClass("bg-amber-500/10");
    expect(button).toHaveClass("text-amber-400");
  });

  it("button has tooltip with program description", () => {
    render(<MilesAlertButton {...defaultProps} />);
    const button = screen.getByRole("button", { name: /miles alert/i });
    expect(button).toHaveAttribute("title");
  });
});
