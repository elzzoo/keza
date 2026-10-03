import { render, screen, waitFor } from "@testing-library/react";
import { CompteClient } from "@/app/compte/CompteClient";

const mockUseSession = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signOut: jest.fn(),
}));

jest.mock("@/components/Header", () => ({
  Header: ({ lang }: { lang: "fr" | "en" }) => <header data-testid="header">{lang}</header>,
}));

jest.mock("@/components/Footer", () => ({
  Footer: ({ lang }: { lang: "fr" | "en" }) => <footer data-testid="footer">{lang}</footer>,
}));

describe("CompteClient layout", () => {
  beforeEach(() => {
    mockUseSession.mockReset();
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ profile: null }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses the global layout when the user is signed out", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<CompteClient />);

    expect(screen.getByTestId("header")).toHaveTextContent("fr");
    expect(screen.getByTestId("footer")).toHaveTextContent("fr");
    expect(screen.getByText(/tu n'es pas connecté/i)).toBeInTheDocument();
  });

  it("uses the global layout when the user is signed in", async () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { email: "test@example.com", name: "Test User" } },
    });

    render(<CompteClient />);

    expect(screen.getByTestId("header")).toHaveTextContent("fr");
    expect(screen.getByTestId("footer")).toHaveTextContent("fr");
    expect(screen.getByRole("heading", { name: /mon compte/i })).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/profile"));
  });
});
