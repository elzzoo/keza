import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AlertesClient } from "@/app/alertes/AlertesClient";
import type { PriceAlert } from "@/lib/alerts";

jest.mock("@/components/Header", () => ({
  Header: ({ lang }: { lang: "fr" | "en" }) => <header>Header {lang}</header>,
}));

jest.mock("@/components/Footer", () => ({
  Footer: ({ lang }: { lang: "fr" | "en" }) => <footer>Footer {lang}</footer>,
}));

jest.mock("@/components/PushAlertButton", () => ({
  PushAlertButton: () => <div>Push alerts</div>,
}));

jest.mock("@/components/ReferralCard", () => ({
  ReferralCard: () => <div>Referral card</div>,
}));

jest.mock("@/components/MilesValueScore", () => ({
  MilesValueScore: () => <div>Miles score</div>,
}));

jest.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ profile: { programs: [] } }),
}));

const mockUseProAccess = jest.fn(() => ({
  isActive: false,
  loading: false,
  error: null,
}));

jest.mock("@/hooks/useProAccess", () => ({
  useProAccess: () => mockUseProAccess(),
}));

const makeAlert = (id: string, from: string, to: string): PriceAlert => ({
  id,
  email: "solo@example.com",
  from,
  to,
  cabin: "economy",
  basePrice: 500,
  targetPrice: 450,
  createdAt: "2026-09-01T00:00:00.000Z",
  notifCount: 0,
  active: true,
  notifFrequency: "instant",
});

describe("AlertesClient", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        alerts: [
          makeAlert("a1", "DSS", "CDG"),
          makeAlert("a2", "DSS", "JFK"),
          makeAlert("a3", "DSS", "DXB"),
        ],
      }),
    });
  });

  it("starts in English and links free-limit users to the localized Pro page", async () => {
    localStorage.setItem("keza:alertes:email", "solo@example.com");
    localStorage.setItem("keza:alertes:token", "manage-token");

    render(<AlertesClient initialLang="en" />);

    expect(screen.getByRole("heading", { name: "My price alerts" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("3 active alert(s)")).toBeInTheDocument();
    });

    expect(screen.getByText("Free alert limit reached")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Unlock Xalifly Pro →" })).toHaveAttribute(
      "href",
      "/en/pro"
    );
  });
});
