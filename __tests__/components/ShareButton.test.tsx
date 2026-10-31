import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
  },
}));

jest.mock("@/lib/analytics", () => ({
  trackShare: jest.fn(),
}));

const mockToast = toast as jest.Mocked<typeof toast>;

describe("ShareButton", () => {
  const defaultProps = {
    lang: "en" as const,
    searchParams: {
      from: "CDG",
      to: "LAX",
      date: "2025-06-20",
      cabin: "economy",
      tripType: "oneway" as const,
      pax: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
      },
    });
  });

  it("renders share button", () => {
    render(<ShareButton {...defaultProps} />);
    const button = screen.getByRole("button", { name: /share/i });
    expect(button).toBeInTheDocument();
  });

  it("shows toast notification on successful copy (English)", async () => {
    render(<ShareButton {...defaultProps} />);
    const button = screen.getByRole("button", { name: /share/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("URL copied!");
    });
  });

  it("shows toast notification on successful copy (French)", async () => {
    render(<ShareButton {...defaultProps} lang="fr" />);
    const button = screen.getByRole("button", { name: /partager/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Lien copié !");
    });
  });

  it("shows toast notification even on fallback copy", async () => {
    // Mock clipboard failure to trigger fallback
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(
      new Error("Clipboard not available")
    );

    // Mock document.execCommand and appendChild/removeChild
    const execCommandSpy = jest.fn(() => true);
    Object.defineProperty(document, "execCommand", {
      value: execCommandSpy,
      configurable: true,
    });

    render(<ShareButton {...defaultProps} />);
    const button = screen.getByRole("button", { name: /share/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("URL copied!");
    });
  });

  it("changes button appearance after click", async () => {
    render(<ShareButton {...defaultProps} />);
    const button = screen.getByRole("button");

    expect(button).toHaveTextContent("Share");

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveTextContent("Copied!");
    });
  });

  it("shares the route without unverified fare claims", async () => {
    const mockWriteText = jest.fn(() => Promise.resolve());
    (navigator.clipboard.writeText as jest.Mock).mockImplementation(mockWriteText);

    render(<ShareButton {...defaultProps} />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
      const urlString = (mockWriteText.mock.calls[0] as unknown[])[0] as string;
      expect(urlString).toContain("from=CDG");
      expect(urlString).toContain("to=LAX");
      expect(urlString).toContain("date=2025-06-20");
      expect(urlString).toContain("cabin=economy");
      expect(urlString).toContain("tripType=oneway");
      expect(urlString).toContain("pax=1");
      const url = new URL(urlString);
      expect(url.pathname).toBe("/en");
      expect(url.searchParams.has("savings")).toBe(false);
      expect(url.searchParams.has("price")).toBe(false);
      expect(url.searchParams.has("program")).toBe(false);
    });
  });

  it("keeps French shared searches on the French home", async () => {
    render(<ShareButton {...defaultProps} lang="fr" />);
    fireEvent.click(screen.getByRole("button", { name: /partager/i }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    const url = new URL((navigator.clipboard.writeText as jest.Mock).mock.calls[0][0] as string);
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("from")).toBe("CDG");
    expect(url.searchParams.get("to")).toBe("LAX");
  });
});
