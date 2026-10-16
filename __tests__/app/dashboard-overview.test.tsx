/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/dashboard/page";

jest.mock("next/dynamic", () => () =>
  function MockChart({ title, data }: { title: string; data: unknown[] }) {
    return <div data-testid={title}>{JSON.stringify(data)}</div>;
  }
);

describe("dashboard overview", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders measured search history and top routes from the API", async () => {
    const dailySearches = [
      { date: "2026-10-15", searches: 2 },
      { date: "2026-10-16", searches: 4 },
    ];
    const routes = [
      { route: "DSS-CDG", searchCount: 6, conversionCount: 1, totalRevenue: 0, topProgram: null },
    ];
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(async (url) => ({
      ok: true,
      json: async () => String(url).includes("overview")
        ? {
            totalSearches: 6,
            totalConversions: 1,
            totalAlerts: 0,
            uniqueUsers: 2,
            totalRevenue: 0,
            avgSearchDuration: 100,
            cacheHitRate: 50,
            conversionRate: 16.7,
            dailySearches,
          }
        : routes,
    } as Response));

    render(<DashboardPage />);

    expect(await screen.findByTestId("Search Volume Trend")).toHaveTextContent(
      JSON.stringify(dailySearches)
    );
    expect(screen.getByTestId("Top 5 Routes by Searches")).toHaveTextContent(
      JSON.stringify([{ route: "DSS-CDG", searches: 6 }])
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/dashboard/overview?days=30");
    expect(fetchMock).toHaveBeenCalledWith("/api/dashboard/routes?days=30&limit=5");
  });
});
