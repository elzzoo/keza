/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CheapestDatesCalendar } from "@/components/CheapestDatesCalendar";

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CheapestDatesCalendar", () => {
  function futureDateInCurrentMonth(): string {
    const now = new Date();
    const day = Math.min(now.getDate() + 1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  it("fetches calendar prices with an abort signal", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ days: [] }),
    });

    render(<CheapestDatesCalendar from="CDG" to="JFK" lang="en" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/calendar\?from=CDG&to=JFK&month=\d{4}-\d{2}$/),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it("renders available future prices", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        days: [{ date: futureDateInCurrentMonth(), price: 420 }],
      }),
    });

    render(<CheapestDatesCalendar from="CDG" to="JFK" lang="en" />);

    await waitFor(() => {
      expect(screen.getByText("$420")).toBeInTheDocument();
    });
  });

  it("shows an empty state when no days are returned", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ days: [] }),
    });

    render(<CheapestDatesCalendar from="CDG" to="JFK" lang="en" />);

    await waitFor(() => {
      expect(screen.getByText("No data available for this month")).toBeInTheDocument();
    });
  });

  it("aborts the in-flight request on unmount", () => {
    let signal: AbortSignal | undefined;
    (global.fetch as jest.Mock).mockImplementationOnce((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise(() => {});
    });

    const { unmount } = render(<CheapestDatesCalendar from="CDG" to="JFK" lang="en" />);
    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
