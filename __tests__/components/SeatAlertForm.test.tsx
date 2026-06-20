import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SeatAlertForm } from "@/components/SeatAlertForm";

// Mock fetch
global.fetch = jest.fn();

describe("SeatAlertForm", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it("renders form with all fields", () => {
    render(<SeatAlertForm />);
    expect(screen.getByText("Create Seat Preference Alert")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("SIN-LAX")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("5000")).toBeInTheDocument();
  });

  it("submits form and calls onSuccess callback", async () => {
    const onSuccess = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "123" }),
    });

    render(<SeatAlertForm onSuccess={onSuccess} />);

    const routeInput = screen.getByPlaceholderText("SIN-LAX") as HTMLInputElement;
    const priceInput = screen.getByPlaceholderText("5000") as HTMLInputElement;
    const submitButton = screen.getByText("Create Alert");

    fireEvent.change(routeInput, { target: { value: "SIN-LAX" } });
    fireEvent.change(priceInput, { target: { value: "5000" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/alerts/seat",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows loading state while submitting", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve({ ok: true, json: async () => ({ id: "123" }) }),
            200
          );
        })
    );

    render(<SeatAlertForm />);

    const routeInput = screen.getByPlaceholderText("SIN-LAX") as HTMLInputElement;
    const priceInput = screen.getByPlaceholderText("5000") as HTMLInputElement;
    const submitButton = screen.getByText("Create Alert") as HTMLButtonElement;

    fireEvent.change(routeInput, { target: { value: "SIN-LAX" } });
    fireEvent.change(priceInput, { target: { value: "5000" } });
    fireEvent.click(submitButton);

    // Button should be disabled after click
    expect(submitButton.disabled).toBe(true);

    // Wait for loading text to appear
    await waitFor(() => {
      expect(screen.getByText("Creating...")).toBeInTheDocument();
    });
  });

  it("calls onError when submission fails", async () => {
    const onError = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(<SeatAlertForm onError={onError} />);

    const routeInput = screen.getByPlaceholderText("SIN-LAX") as HTMLInputElement;
    const priceInput = screen.getByPlaceholderText("5000") as HTMLInputElement;
    const submitButton = screen.getByText("Create Alert");

    fireEvent.change(routeInput, { target: { value: "SIN-LAX" } });
    fireEvent.change(priceInput, { target: { value: "5000" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(onError).toHaveBeenCalled();
  });
});
