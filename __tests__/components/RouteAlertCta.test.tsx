/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RouteAlertCta } from "@/components/RouteAlertCta";

global.fetch = jest.fn();

const mockUpgradeModal = jest.fn(({ lang }: { lang: "fr" | "en" }) => (
  <div data-testid="upgrade-modal">{lang}</div>
));

jest.mock("@/components/UpgradeModal", () => ({
  UpgradeModal: (props: { lang: "fr" | "en"; onClose: () => void; prefillEmail?: string }) =>
    mockUpgradeModal(props),
}));

describe("RouteAlertCta", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders English copy on English route pages", () => {
    render(<RouteAlertCta from="CDG" to="JFK" fromCity="Paris" toCity="New York" lang="en" />);

    expect(screen.getByText("Price alert — Paris → New York")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Target price")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create alert — free/i })).toBeInTheDocument();
  });

  it("opens an English upgrade modal when the free limit is reached", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ code: "FREE_LIMIT_REACHED" }),
    });

    render(<RouteAlertCta from="CDG" to="JFK" fromCity="Paris" toCity="New York" lang="en" />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Target price"), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create alert — free/i }));

    await waitFor(() => {
      expect(screen.getByTestId("upgrade-modal")).toHaveTextContent("en");
    });
    expect(mockUpgradeModal).toHaveBeenCalledWith(
      expect.objectContaining({ lang: "en", prefillEmail: "user@example.com" })
    );
  });
});
