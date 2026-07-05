import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MilesAlertModal } from "@/components/MilesAlertModal";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe("MilesAlertModal", () => {
  const defaultProps = {
    route: "SIN-LAX",
    program: "Singapore KrisFlyer",
    currentCpp: 2.0,
    onClose: jest.fn(),
    lang: "en" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (global.fetch as jest.Mock).mockClear();
  });

  it("renders modal with title and route info", () => {
    render(<MilesAlertModal {...defaultProps} />);
    expect(screen.getByText(/Miles alert/i)).toBeInTheDocument();
    expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
    expect(screen.getByText("Singapore KrisFlyer")).toBeInTheDocument();
  });

  it("renders French labels when lang is 'fr'", () => {
    render(<MilesAlertModal {...defaultProps} lang="fr" />);
    expect(screen.getByText(/Alerte miles/i)).toBeInTheDocument();
  });

  it("displays CPP slider and updates value on change", async () => {
    render(<MilesAlertModal {...defaultProps} />);
    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();

    // Default value should be 90% of currentCpp = 1.80
    expect(slider).toHaveValue("1.8");

    fireEvent.change(slider, { target: { value: "1.5" } });
    expect(slider).toHaveValue("1.5");
  });

  it("displays email input field", () => {
    render(<MilesAlertModal {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText("you@example.com");
    expect(emailInput).toBeInTheDocument();
  });

  it("loads email from localStorage if available", () => {
    localStorage.setItem("keza:alertes:email", "saved@example.com");
    render(<MilesAlertModal {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText("you@example.com") as HTMLInputElement;
    expect(emailInput.value).toBe("saved@example.com");
  });

  it("closes modal when close button is clicked", async () => {
    const onClose = jest.fn();
    render(<MilesAlertModal {...defaultProps} onClose={onClose} />);
    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes modal when clicking outside (on backdrop)", async () => {
    const onClose = jest.fn();
    const { container } = render(<MilesAlertModal {...defaultProps} onClose={onClose} />);
    const backdrop = container.firstChild;
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalled();
  });

  it("submits form with correct data", async () => {
    const onClose = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
    });

    render(<MilesAlertModal {...defaultProps} onClose={onClose} />);

    // Fill email
    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create alert/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/miles-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          route: "SIN-LAX",
          program: "Singapore KrisFlyer",
          thresholdCpp: 1.8, // 90% of 2.0
        }),
      });
    });
  });

  it("saves email to localStorage on successful submission", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
    });

    render(<MilesAlertModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: /create alert/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(localStorage.getItem("keza:alertes:email")).toBe("test@example.com");
    });
  });

  it("closes modal after successful submission", async () => {
    const onClose = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
    });

    render(<MilesAlertModal {...defaultProps} onClose={onClose} />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: /create alert/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("disables submit button while loading", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ ok: true, status: 201 }), 100))
    );

    render(<MilesAlertModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: /create alert/i }) as HTMLButtonElement;
    fireEvent.click(submitButton);

    // Button should be disabled
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("trims and lowercases email before submission", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
    });

    render(<MilesAlertModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "  TEST@EXAMPLE.COM  " } });

    const submitButton = screen.getByRole("button", { name: /create alert/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/miles-alerts",
        expect.objectContaining({
          body: expect.stringContaining('"email":"test@example.com"'),
        })
      );
    });
  });

  it("handles API errors gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid email" }),
    });

    render(<MilesAlertModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: /create alert/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("handles network errors gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<MilesAlertModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: /create alert/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("disables submit button when email is empty", () => {
    render(<MilesAlertModal {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    const submitButton = buttons[buttons.length - 1] as HTMLButtonElement; // Last button is submit
    expect(submitButton).toBeDisabled();
  });
});
