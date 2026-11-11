/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { DataTrustPanel } from "@/components/DataTrustPanel";

describe("DataTrustPanel", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-22T12:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("FR full layout", () => {
    it("shows fare sources with cache qualifier — no success live badge", () => {
      render(<DataTrustPanel lang="fr" />);

      expect(screen.getByRole("heading", { name: "Qualité des données" })).toBeInTheDocument();
      expect(screen.getByText("Prix fournisseurs")).toBeInTheDocument();
      expect(screen.getByText("Duffel · cache TP")).toBeInTheDocument();
      expect(screen.getByText(/prix récents mis en cache/i)).toBeInTheDocument();
      // No standalone "live" badge text
      expect(screen.queryByText(/^live$/i)).not.toBeInTheDocument();
      // No old heading
      expect(screen.queryByText("Prix cash live")).not.toBeInTheDocument();
    });

    it("shows booking disclaimer asking users to confirm before reserving", () => {
      render(<DataTrustPanel lang="fr" />);

      expect(screen.getByText(/avant de réserver/i)).toBeInTheDocument();
    });

    it("shows miles valuation stale warning and sources footer", () => {
      render(<DataTrustPanel lang="fr" />);

      expect(screen.getAllByText(/mai 2026/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Estimations anciennes · mai 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/Estimations anciennes à revalider/i)).toBeInTheDocument();
      expect(screen.getByText(/Sources : Duffel, Aviasales/)).toBeInTheDocument();
      expect(screen.getByText(/valeurs miles\/points/)).toBeInTheDocument();
    });
  });

  describe("EN full layout", () => {
    it("shows fare sources with cache qualifier — no success live badge", () => {
      render(<DataTrustPanel lang="en" />);

      expect(screen.getByRole("heading", { name: "Data quality" })).toBeInTheDocument();
      expect(screen.getByText("Fare sources")).toBeInTheDocument();
      expect(screen.getByText("Duffel · TP cache")).toBeInTheDocument();
      expect(screen.getByText(/recently cached/i)).toBeInTheDocument();
      // No standalone "live" badge text
      expect(screen.queryByText(/^live$/i)).not.toBeInTheDocument();
      // No old heading
      expect(screen.queryByText("Live cash fares")).not.toBeInTheDocument();
    });

    it("shows booking disclaimer asking users to confirm before booking", () => {
      render(<DataTrustPanel lang="en" />);

      expect(screen.getByText(/before booking/i)).toBeInTheDocument();
    });

    it("shows miles valuation stale warning", () => {
      render(<DataTrustPanel lang="en" />);

      expect(screen.getByText(/Older estimates need review/i)).toBeInTheDocument();
    });

    it("does not warn when the latest reference date is recent", () => {
      jest.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
      render(<DataTrustPanel lang="en" />);

      expect(screen.getByText(/Miles reference · May 2026/)).toBeInTheDocument();
      expect(screen.queryByText(/Older estimates need review/)).not.toBeInTheDocument();
    });
  });

  describe("FR compact layout", () => {
    it("omits heading and shows fare sources with cache qualifier", () => {
      render(<DataTrustPanel lang="fr" compact />);

      expect(screen.queryByRole("heading", { name: "Qualité des données" })).not.toBeInTheDocument();
      expect(screen.getByText("Prix fournisseurs")).toBeInTheDocument();
      expect(screen.getByText(/cache récent/i)).toBeInTheDocument();
      expect(screen.queryByText(/^live$/i)).not.toBeInTheDocument();
      expect(screen.queryByText("Prix cash live")).not.toBeInTheDocument();
    });

    it("includes booking confirmation prompt in body", () => {
      render(<DataTrustPanel lang="fr" compact />);

      expect(screen.getByText(/à confirmer avant de réserver/i)).toBeInTheDocument();
    });

    it("shows miles valuation stale warning", () => {
      render(<DataTrustPanel lang="fr" compact />);

      expect(screen.getByText(/Estimations anciennes à revalider/i)).toBeInTheDocument();
    });
  });

  describe("EN compact layout", () => {
    it("omits heading and shows fare sources with cache qualifier", () => {
      render(<DataTrustPanel lang="en" compact />);

      expect(screen.queryByRole("heading", { name: "Data quality" })).not.toBeInTheDocument();
      expect(screen.getByText("Fare sources")).toBeInTheDocument();
      expect(screen.getByText(/recent cache/i)).toBeInTheDocument();
      expect(screen.queryByText(/^live$/i)).not.toBeInTheDocument();
      expect(screen.queryByText("Live cash fares")).not.toBeInTheDocument();
    });

    it("includes booking confirmation prompt in body", () => {
      render(<DataTrustPanel lang="en" compact />);

      expect(screen.getByText(/Confirm price and availability before booking/i)).toBeInTheDocument();
    });

    it("shows miles valuation stale warning", () => {
      render(<DataTrustPanel lang="en" compact />);

      expect(screen.getByText(/Older estimates need review/i)).toBeInTheDocument();
    });
  });
});
