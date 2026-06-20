import { render, screen } from "@testing-library/react";
import { DealRecommendationWidget } from "@/components/DealRecommendationWidget";
import { DealScore } from "@/lib/dealScorer";

describe("DealRecommendationWidget", () => {
  const mockDeals: DealScore[] = [
    {
      route: "SIN-LAX",
      currentPrice: 550,
      historicalAvg: 750,
      discount: 26.7,
      score: 0.85,
      hasSufficientMiles: true,
      recommendation: "Exceptional deal!",
    },
    {
      route: "NRT-LAX",
      currentPrice: 620,
      historicalAvg: 680,
      discount: 8.8,
      score: 0.72,
      hasSufficientMiles: true,
      recommendation: "Great deal for you!",
    },
    {
      route: "DXB-LHR",
      currentPrice: 480,
      historicalAvg: 600,
      discount: 20.0,
      score: 0.78,
      hasSufficientMiles: false,
      recommendation: "Great deal for you!",
    },
  ];

  it("renders deal recommendations", () => {
    render(<DealRecommendationWidget deals={mockDeals} />);
    expect(screen.getByText(/SIN.*LAX/)).toBeInTheDocument();
    expect(screen.getByText(/\$550/)).toBeInTheDocument();
  });

  it("shows discount percentage", () => {
    render(<DealRecommendationWidget deals={mockDeals} />);
    expect(screen.getByText(/26\.7%/)).toBeInTheDocument();
  });

  it("displays recommendation text", () => {
    render(<DealRecommendationWidget deals={mockDeals} />);
    const text = screen.getAllByText(/Exceptional deal|Great deal/);
    expect(text.length).toBeGreaterThan(0);
  });

  it("shows up to 3 deals by default", () => {
    const manyDeals = Array.from({ length: 5 }, (_, i) => ({
      ...mockDeals[0],
      route: `ROUTE-${i}`,
    }));
    render(<DealRecommendationWidget deals={manyDeals} />);
    const buttons = screen.getAllByText(/Book Now/);
    expect(buttons).toHaveLength(3);
  });

  it("respects maxDeals prop", () => {
    const manyDeals = Array.from({ length: 5 }, (_, i) => ({
      ...mockDeals[0],
      route: `ROUTE-${i}`,
    }));
    render(<DealRecommendationWidget deals={manyDeals} maxDeals={2} />);
    const buttons = screen.getAllByText(/Book Now/);
    expect(buttons).toHaveLength(2);
  });

  it("shows empty state when no deals", () => {
    render(<DealRecommendationWidget deals={[]} />);
    expect(
      screen.getByText(/No deals available right now/)
    ).toBeInTheDocument();
  });

  it("renders Book Now button for each deal", () => {
    render(<DealRecommendationWidget deals={mockDeals.slice(0, 2)} />);
    const buttons = screen.getAllByText(/Book Now/);
    expect(buttons).toHaveLength(2);
  });

  it("colors exceptional deals differently", () => {
    const { container } = render(<DealRecommendationWidget deals={mockDeals} />);
    // The first deal has score 0.85 so should have green border
    const greenBordered = container.querySelector(".border-green-500");
    expect(greenBordered).toBeInTheDocument();
  });

  it("colors good deals with blue border", () => {
    const { container } = render(<DealRecommendationWidget deals={mockDeals} />);
    // The second deal has score 0.72 so should have blue border
    const blueBordered = container.querySelector(".border-blue-300");
    expect(blueBordered).toBeInTheDocument();
  });

  it("displays historical average price", () => {
    render(<DealRecommendationWidget deals={mockDeals.slice(0, 1)} />);
    expect(screen.getByText(/Usually:\s*\$750/)).toBeInTheDocument();
  });

  it("shows miles indicator when user has miles", () => {
    render(<DealRecommendationWidget deals={mockDeals.slice(0, 1)} />);
    expect(screen.getByText(/✓ You have miles/)).toBeInTheDocument();
  });

  it("hides miles indicator when user lacks miles", () => {
    render(<DealRecommendationWidget deals={mockDeals.slice(2, 3)} />);
    const milesIndicators = screen.queryAllByText(/✓ You have miles/);
    expect(milesIndicators).toHaveLength(0);
  });

  it("shows recommended deals header", () => {
    render(<DealRecommendationWidget deals={mockDeals.slice(0, 1)} />);
    expect(screen.getByText(/Recommended Deals/)).toBeInTheDocument();
  });
});
