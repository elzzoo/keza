import { render, screen, fireEvent } from "@testing-library/react";

const mockUseSession = jest.fn(
  (): { data: unknown; status: string } => ({ data: null, status: "unauthenticated" })
);
const mockSignOut = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signIn: jest.fn(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

import { AuthButton } from "@/components/AuthButton";

describe("AuthButton", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    mockSignOut.mockClear();
  });

  it("shows login button when not authenticated", () => {
    render(<AuthButton lang="fr" />);
    expect(screen.getByRole("button", { name: /connexion/i })).toBeInTheDocument();
  });

  it("uses localized profile and sign-out URLs for English authenticated users", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "user@example.com", name: "User" } },
      status: "authenticated",
    });

    render(<AuthButton lang="en" />);

    expect(await screen.findByRole("link", { name: /my account/i })).toHaveAttribute(
      "href",
      "/en/profile"
    );
    expect(await screen.findByRole("link", { name: /miles wallet/i })).toHaveAttribute(
      "href",
      "/en/profile"
    );

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/en" });
  });
});
