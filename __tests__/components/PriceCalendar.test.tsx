/**
 * @jest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PriceCalendar } from "@/components/PriceCalendar";

global.fetch = jest.fn();

const futureDay = new Date();
futureDay.setUTCDate(futureDay.getUTCDate() + 7);
const futureDate = futureDay.toISOString().slice(0, 10);

const baseProps = {
  from: "CDG",
  to: "JFK",
  selectedDate: futureDate,
  onSelectDate: jest.fn(),
  lang: "en" as const,
  cabin: "economy",
  formatPrice: (usd: number) => `$${usd}`,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PriceCalendar", () => {
  it("fetches calendar prices with an abort signal", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ days: [] }),
    });

    render(<PriceCalendar {...baseProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/calendar?from=CDG&to=JFK&month=${futureDate.slice(0, 7)}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it("renders available prices and calls onSelectDate for a priced future day", async () => {
    const onSelectDate = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        days: [{ date: futureDate, price: 420, stops: 0 }],
      }),
    });

    render(<PriceCalendar {...baseProps} onSelectDate={onSelectDate} />);

    await waitFor(() => {
      expect(screen.getAllByText("$420")).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${futureDay.getUTCDate()} \\$420`, "i") }));

    expect(onSelectDate).toHaveBeenCalledWith(futureDate);
  });

  it("shows a load error when the calendar endpoint fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    render(<PriceCalendar {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText("Load error")).toBeInTheDocument();
    });
  });

  it("does not fetch when origin and destination are identical", async () => {
    render(<PriceCalendar {...baseProps} to="CDG" />);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
