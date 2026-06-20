import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SeatAlertWidget } from "@/components/SeatAlertWidget";
import { SeatAlertSubscription } from "@/lib/seatAlerts";

// Mock fetch
global.fetch = jest.fn();

// Mock window.confirm and window.location.reload
global.confirm = jest.fn(() => true);

describe("SeatAlertWidget", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    (global.confirm as jest.Mock).mockClear();
  });

  it("fetches and displays alerts on mount", async () => {
    const mockAlerts: SeatAlertSubscription[] = [
      {
        email: "user@example.com",
        route: "SIN-LAX",
        cabin: "BUSINESS",
        minPrice: 5000,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
      {
        email: "user@example.com",
        route: "LAX-NRT",
        cabin: "ECONOMY",
        minPrice: 1000,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
    });

    render(<SeatAlertWidget />);

    await waitFor(() => {
      expect(screen.getByText("Active Seat Alerts")).toBeInTheDocument();
      expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
      expect(screen.getByText("LAX-NRT")).toBeInTheDocument();
    });
  });

  it("shows empty state when no alerts exist", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<SeatAlertWidget />);

    await waitFor(() => {
      expect(screen.getByText("No seat preference alerts yet.")).toBeInTheDocument();
    });
  });

  it("deletes alert when delete button clicked", async () => {
    const mockAlerts: SeatAlertSubscription[] = [
      {
        email: "user@example.com",
        route: "SIN-LAX",
        cabin: "BUSINESS",
        minPrice: 5000,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<SeatAlertWidget />);

    await waitFor(() => {
      expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith("Delete alert for SIN-LAX?");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/alerts/seat",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  it("shows loading state initially", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => [],
              }),
            100
          );
        })
    );

    render(<SeatAlertWidget />);
    expect(screen.getByText("Loading alerts...")).toBeInTheDocument();
  });
});
