import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OnboardingClient } from "@/app/onboarding/OnboardingClient";
import { toast } from "sonner";

const mockPush = jest.fn();
const mockUseSession = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/components/Header", () => ({
  Header: ({ lang }: { lang: "fr" | "en" }) => <header data-testid="header">{lang}</header>,
}));

jest.mock("@/components/Footer", () => ({
  Footer: ({ lang }: { lang: "fr" | "en" }) => <footer data-testid="footer">{lang}</footer>,
}));

describe("OnboardingClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { email: "user@example.com" } },
      status: "authenticated",
    });
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the French onboarding route with localized layout", () => {
    render(<OnboardingClient lang="fr" />);

    expect(screen.getByTestId("header")).toHaveTextContent("fr");
    expect(screen.getByTestId("footer")).toHaveTextContent("fr");
    expect(screen.getByRole("heading", { name: "Configure ton profil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plus tard" })).toBeInTheDocument();
  });

  it("renders the English onboarding route with localized layout", () => {
    render(<OnboardingClient lang="en" />);

    expect(screen.getByTestId("header")).toHaveTextContent("en");
    expect(screen.getByTestId("footer")).toHaveTextContent("en");
    expect(screen.getByRole("heading", { name: "Set up your profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip for now" })).toBeInTheDocument();
  });

  it("redirects unauthenticated users to the localized home", async () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<OnboardingClient lang="en" />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/en"));
  });

  it("saves selected programs and keeps the user on the localized route family", async () => {
    render(<OnboardingClient lang="en" />);

    fireEvent.click(screen.getByRole("button", { name: /Flying Blue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programs: ["Flying Blue"],
          hasOnboarded: true,
        }),
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Profile set up.");
    expect(mockPush).toHaveBeenCalledWith("/en");
  });
});
