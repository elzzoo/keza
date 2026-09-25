/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AffiliateRevenueSection } from "@/app/admin/components/AffiliateRevenueSection";

describe("AffiliateRevenueSection", () => {
  it("renders affiliate click and revenue metrics", () => {
    render(
      <AffiliateRevenueSection
        clicksToday={5}
        clicksTotal={120}
        estimatedBookings={4}
        estimatedRevenue={72}
      />,
    );

    expect(screen.getByText("Clicks Affiliés & Revenu")).toBeInTheDocument();
    expect(screen.getByText("Clicks aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText("Clicks total")).toBeInTheDocument();
    expect(screen.getByText("Réservations estimées")).toBeInTheDocument();
    expect(screen.getByText("Revenu estimé")).toBeInTheDocument();
    expect(screen.getByText("$72")).toBeInTheDocument();
  });
});
