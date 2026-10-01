/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DestinationsGrid, __resetDestinationPhotoCacheForTests } from "@/components/DestinationsGrid";

jest.mock("@/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (value: number) => `$${value}`,
  }),
}));

jest.mock("@/lib/analytics", () => ({
  trackDestinationClick: jest.fn(),
}));

describe("DestinationsGrid", () => {
  beforeEach(() => {
    __resetDestinationPhotoCacheForTests();
    jest.restoreAllMocks();
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://images.unsplash.com/cached.jpg" }),
    } as Response);
  });

  it("reuses fetched destination photos across remounts", async () => {
    const first = render(<DestinationsGrid lang="en" onSelect={jest.fn()} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(6);
    });

    first.unmount();

    render(<DestinationsGrid lang="en" onSelect={jest.fn()} />);

    expect(await screen.findByText("Destinations to explore")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });
});
