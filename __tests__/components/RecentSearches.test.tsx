/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { RecentSearches } from "@/components/RecentSearches";

describe("RecentSearches", () => {
  it("renders recent searches and calls onSelect", async () => {
    const onSelect = jest.fn();
    render(
      <RecentSearches
        lang="en"
        onSelect={onSelect}
        searches={[
          {
            from: "CDG",
            to: "JFK",
            date: "2026-10-15",
            tripType: "roundtrip",
            cabin: "economy",
            timestamp: new Date().toISOString(),
            recommendation: "USE_MILES",
            bestSavings: 120,
          },
        ]}
      />
    );

    expect(screen.getByText("Recent searches")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /CDG.*JFK/ }));
    expect(onSelect).toHaveBeenCalledWith("CDG", "JFK");
  });
});
