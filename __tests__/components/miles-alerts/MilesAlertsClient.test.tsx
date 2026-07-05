import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { MilesAlertsClient } from "@/app/miles-alerts/MilesAlertsClient";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("MilesAlertsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
    (toast.success as jest.Mock).mockClear();
  });

  describe("Search form", () => {
    it("renders search form with email input and search button", () => {
      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");
      expect(emailInput).toBeInTheDocument();
      expect(searchButton).toBeInTheDocument();
    });

    it("shows error toast when email is empty and submit is clicked", async () => {
      render(<MilesAlertsClient />);
      const searchButton = screen.getByText("Search");
      fireEvent.click(searchButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Enter your email");
      });
    });

    it("fetches alerts when form is submitted with valid email", async () => {
      const mockAlerts = [
        {
          email: "test@example.com",
          route: "SIN-LAX",
          program: "Singapore KrisFlyer",
          thresholdCpp: 1.5,
          createdAt: 1234567890,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockAlerts }),
      });

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/miles-alerts?email=test%40example.com"
        );
      });
    });

    it("shows loading state while fetching", async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce({
        ok: true,
        json: async () => {
          await promise;
          return { alerts: [] };
        },
      });

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument();
      });

      resolvePromise!();
    });

    it("shows error toast when fetch fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Error loading alerts");
      });
    });
  });

  describe("Alerts display", () => {
    it("shows 'no alerts' message when search returns empty", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: [] }),
      });

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("No alerts found for this email.")).toBeInTheDocument();
      });
    });

    it("displays alerts when search returns results", async () => {
      const mockAlerts = [
        {
          email: "test@example.com",
          route: "SIN-LAX",
          program: "Singapore KrisFlyer",
          thresholdCpp: 1.5,
          createdAt: 1234567890,
        },
        {
          email: "test@example.com",
          route: "SIN-JFK",
          program: "Flying Blue",
          thresholdCpp: 2.0,
          createdAt: 1234567891,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockAlerts }),
      });

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Your Alerts (2)")).toBeInTheDocument();
        expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
        expect(screen.getByText("SIN-JFK")).toBeInTheDocument();
        expect(screen.getByText("Singapore KrisFlyer")).toBeInTheDocument();
        expect(screen.getByText("Flying Blue")).toBeInTheDocument();
      });
    });

    it("displays alert threshold and creation date", async () => {
      const mockAlerts = [
        {
          email: "test@example.com",
          route: "SIN-LAX",
          program: "Singapore KrisFlyer",
          thresholdCpp: 1.5,
          createdAt: 1704067200, // 2024-01-01
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockAlerts }),
      });

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/Alert when CPP ≤ 1.50¢/)).toBeInTheDocument();
        expect(screen.getByText(/Created 1\/1\/2024/)).toBeInTheDocument();
      });
    });
  });

  describe("Delete functionality", () => {
    it("calls delete API with correct Redis key format", async () => {
      const mockAlerts = [
        {
          email: "test@example.com",
          route: "SIN-LAX",
          program: "Singapore KrisFlyer",
          thresholdCpp: 1.5,
          createdAt: 1234567890,
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ alerts: mockAlerts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true);

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
      });

      const deleteButton = screen.getByText("Delete");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/miles-alerts", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alertId: "keza:miles-alert:test@example.com:SIN-LAX:Singapore KrisFlyer",
          }),
        });
      });
    });

    it("removes alert from list after successful delete", async () => {
      const mockAlerts = [
        {
          email: "test@example.com",
          route: "SIN-LAX",
          program: "Singapore KrisFlyer",
          thresholdCpp: 1.5,
          createdAt: 1234567890,
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ alerts: mockAlerts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      window.confirm = jest.fn(() => true);

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Your Alerts (1)")).toBeInTheDocument();
      });

      const deleteButton = screen.getByText("Delete");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Alert deleted");
        expect(screen.queryByText("Your Alerts")).not.toBeInTheDocument();
      });
    });

    it("shows error toast when delete fails", async () => {
      const mockAlerts = [
        {
          email: "test@example.com",
          route: "SIN-LAX",
          program: "Singapore KrisFlyer",
          thresholdCpp: 1.5,
          createdAt: 1234567890,
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ alerts: mockAlerts }),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      window.confirm = jest.fn(() => true);

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
      });

      const deleteButton = screen.getByText("Delete");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Error deleting alert");
      });
    });

    it("does not delete alert if user cancels confirmation", async () => {
      const mockAlerts = [
        {
          email: "test@example.com",
          route: "SIN-LAX",
          program: "Singapore KrisFlyer",
          thresholdCpp: 1.5,
          createdAt: 1234567890,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockAlerts }),
      });

      window.confirm = jest.fn(() => false);

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Search");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
      });

      const deleteButton = screen.getByText("Delete");
      fireEvent.click(deleteButton);

      // Ensure no second fetch call (delete API) was made
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
