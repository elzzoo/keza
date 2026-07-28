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

// MilesAlertsClient now renders the site Header/Footer (it previously had
// none at all — a real bug: the page had no site navigation). Header pulls
// in CurrencyPicker, which needs ProfileProvider; mock both out since this
// suite is about the alert search/delete logic, not site chrome.
jest.mock("@/components/Header", () => ({
  Header: () => <header>Header</header>,
}));
jest.mock("@/components/Footer", () => ({
  Footer: () => <footer>Footer</footer>,
}));

// Mock fetch globally
global.fetch = jest.fn();

const TEST_EMAIL = "test@example.com";
const TEST_TOKEN = "test-manage-token";

describe("MilesAlertsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
    (toast.success as jest.Mock).mockClear();
    localStorage.clear();
    // The client now requires a manage token (proof of ownership) stored
    // locally before it will fetch/delete alerts for an email — see
    // app/api/miles-alerts/route.ts and components/MilesAlertModal.tsx.
    // Seeded here so existing tests keep exercising search/delete behavior
    // rather than the "no token" empty-state path.
    localStorage.setItem(`keza:miles-alerts:token:${TEST_EMAIL}`, TEST_TOKEN);
  });

  describe("Search form", () => {
    it("renders search form with email input and search button", () => {
      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Rechercher");
      expect(emailInput).toBeInTheDocument();
      expect(searchButton).toBeInTheDocument();
    });

    it("shows error toast when email is empty and submit is clicked", async () => {
      render(<MilesAlertsClient />);
      const searchButton = screen.getByText("Rechercher");
      fireEvent.click(searchButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Entrez votre email");
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
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/miles-alerts?email=test%40example.com",
          { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }
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
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Chargement…")).toBeInTheDocument();
      });

      resolvePromise!();
    });

    it("shows error toast when fetch fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<MilesAlertsClient />);
      const emailInput = screen.getByPlaceholderText("your@email.com");
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Erreur lors du chargement des alertes");
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
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Aucune alerte trouvée pour cet email.")).toBeInTheDocument();
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
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Vos alertes (2)")).toBeInTheDocument();
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
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/Alerte si CPP ≤ 1.50¢/)).toBeInTheDocument();
        expect(screen.getByText(/Créée le 01\/01\/2024/)).toBeInTheDocument();
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
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
      });

      const deleteButton = screen.getByText("Supprimer");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/miles-alerts", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TEST_TOKEN}`,
          },
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
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Vos alertes (1)")).toBeInTheDocument();
      });

      const deleteButton = screen.getByText("Supprimer");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Alerte supprimée");
        expect(screen.queryByText("Vos alertes")).not.toBeInTheDocument();
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
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
      });

      const deleteButton = screen.getByText("Supprimer");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Erreur lors de la suppression");
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
      const searchButton = screen.getByText("Rechercher");

      await userEvent.type(emailInput, "test@example.com");
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("SIN-LAX")).toBeInTheDocument();
      });

      const deleteButton = screen.getByText("Supprimer");
      fireEvent.click(deleteButton);

      // Ensure no second fetch call (delete API) was made
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
