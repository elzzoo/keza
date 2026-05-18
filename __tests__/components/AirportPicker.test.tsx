/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AirportPicker } from "@/components/AirportPicker";

// jsdom doesn't implement scrollIntoView — mock it globally
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock the fetch API to avoid real network calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ results: [] }),
  } as Response)
);

const noop = () => {};

const defaultProps = {
  label: "Départ",
  labelEn: "Departure",
  value: "",
  onChange: noop,
  lang: "en" as const,
};

describe("AirportPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });
  });

  it("renders trigger button with the label", () => {
    render(<AirportPicker {...defaultProps} />);
    // The label paragraph is visible
    expect(screen.getByText("Departure")).toBeInTheDocument();
  });

  it("renders placeholder text when no value selected", () => {
    render(<AirportPicker {...defaultProps} />);
    expect(screen.getByText(/Ex: Paris, CDG/i)).toBeInTheDocument();
  });

  it("shows selected airport code when value is set", () => {
    render(<AirportPicker {...defaultProps} value="CDG" />);
    // CDG is in the AIRPORTS data
    expect(screen.getByText("CDG")).toBeInTheDocument();
  });

  it("opens dropdown when trigger button is clicked", async () => {
    render(<AirportPicker {...defaultProps} />);
    const button = screen.getByRole("button", { name: /Departure/i });
    fireEvent.click(button);
    await waitFor(() => {
      // The search input appears when dropdown is open
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  it("shows priority airports when dropdown opens with no query", async () => {
    render(<AirportPicker {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Departure/i }));
    await waitFor(() => {
      // CDG and JFK are in PRIORITY list and should appear as options
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
    });
  });

  it("closes dropdown on Escape key", async () => {
    render(<AirportPicker {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Departure/i }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  it("filters results when typing in the search box", async () => {
    render(<AirportPicker {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Departure/i }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "paris" } });
    });

    // Wait for debounce (200ms) + re-render
    await waitFor(
      () => {
        const options = screen.queryAllByRole("option");
        // Should show CDG (Paris Charles de Gaulle) or ORY (Paris Orly)
        const texts = options.map((o) => o.textContent ?? "");
        const hasParisResult = texts.some((t) =>
          t.toLowerCase().includes("paris") || t.includes("CDG") || t.includes("ORY")
        );
        expect(hasParisResult).toBe(true);
      },
      { timeout: 500 }
    );
  });

  it("calls onChange and closes dropdown when an airport option is clicked", async () => {
    const onChange = jest.fn();
    render(<AirportPicker {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Departure/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
    });

    // Click the first available option
    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    // The dropdown should close after selection
    await waitFor(() => {
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  it("selects airport on Enter key when an option is active", async () => {
    const onChange = jest.fn();
    render(<AirportPicker {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Departure/i }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const input = screen.getByRole("combobox");
    // Navigate down to first option
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // Press Enter to select
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("renders with French label when lang=fr", () => {
    render(
      <AirportPicker
        {...defaultProps}
        lang="fr"
        label="Départ"
        labelEn="Departure"
      />
    );
    expect(screen.getByText("Départ")).toBeInTheDocument();
  });
});
